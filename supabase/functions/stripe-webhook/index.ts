import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details || "");
};

const generateTicketHash = async (serial: string, eventId: string): Promise<string> => {
  const secret = Deno.env.get("TICKET_SECRET") || "default-secret-change-me";
  const data = `${serial}.${eventId}.${secret}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateShortCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    let event: Stripe.Event;
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    logStep("Event type", event.type);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      logStep("Checkout session completed", { sessionId: session.id, metadata: session.metadata });

      // Check if this is a group pay session
      if (session.metadata?.type === "group_pay") {
        await handleGroupPaySession(session, supabaseClient as SupabaseClient);
      } else {
        await handleStandardCheckout(session, stripe, supabaseClient as SupabaseClient);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logStep("Payment failed", { id: paymentIntent.id });
      
      await supabaseClient
        .from("orders")
        .update({ status: 'failed' })
        .eq("stripe_payment_intent_id", paymentIntent.id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// Handle standard checkout (direct ticket purchase)
async function handleStandardCheckout(
  session: Stripe.Checkout.Session, 
  stripe: Stripe,
  supabaseClient: SupabaseClient
) {
  // Get order
  const { data: order, error: orderError } = await supabaseClient
    .from("orders")
    .select("*, events(title, banner_url, slug, starts_at, venue, city)")
    .eq("stripe_checkout_session_id", session.id)
    .single();

  if (orderError || !order) {
    logStep("Order not found", { sessionId: session.id });
    throw new Error("Order not found");
  }

  // Get line items from session
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });

  logStep("Line items retrieved", { count: lineItems.data.length });

  // Extract tier info from line items metadata/description
  const tickets: Array<{
    order_id: string;
    event_id: string;
    user_id: string;
    qr_token: string;
    qr_hash: string;
    status: string;
  }> = [];
  let serialCounter = 1;

  for (const item of lineItems.data) {
    const quantity = item.quantity || 1;
    
    for (let i = 0; i < quantity; i++) {
      const serial = `${order.short_code}-${String(serialCounter).padStart(3, '0')}`;
      const tokenHash = await generateTicketHash(serial, order.event_id);
      
      tickets.push({
        order_id: order.id,
        event_id: order.event_id,
        user_id: order.user_id,
        qr_token: serial,
        qr_hash: tokenHash,
        status: 'valid',
      });

      serialCounter++;
    }
  }

  logStep("Tickets prepared", { count: tickets.length });

  // Create tickets
  const { data: createdTickets, error: ticketsError } = await supabaseClient
    .from("tickets")
    .insert(tickets)
    .select();

  if (ticketsError) {
    logStep("Error creating tickets", ticketsError);
    throw ticketsError;
  }

  // Update order status
  const { error: updateError } = await supabaseClient
    .from("orders")
    .update({
      status: 'completed',
      amount_total_cents: session.amount_total || 0,
    })
    .eq("id", order.id);

  if (updateError) {
    logStep("Error updating order", updateError);
    throw updateError;
  }

  logStep("Order updated and tickets created", { ticketCount: createdTickets?.length || 0 });

  // Send email
  try {
    const { error: emailFunctionError } = await supabaseClient.functions.invoke('send-ticket-email', {
      body: { orderId: order.id }
    });

    if (emailFunctionError) {
      logStep("Erreur envoi email (non-bloquant)", emailFunctionError);
    } else {
      logStep("Email envoyé via le moteur centralisé");
    }
  } catch (emailErr) {
    logStep("Exception envoi email (non-bloquant)", emailErr);
  }
}

// Handle group pay session (individual participant payment)
async function handleGroupPaySession(
  session: Stripe.Checkout.Session,
  supabaseClient: SupabaseClient
) {
  const { group_order_id, participant_id, user_id } = session.metadata || {};

  if (!group_order_id || !participant_id) {
    logStep("Missing group pay metadata", session.metadata);
    throw new Error("Missing group pay metadata");
  }

  logStep("Processing group pay", { group_order_id, participant_id, user_id });

  // 1. Mark participant as paid
  const { error: participantError } = await supabaseClient
    .from("group_order_participants")
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent as string,
      user_id: user_id || null,
    })
    .eq("id", participant_id);

  if (participantError) {
    logStep("Error updating participant", participantError);
    throw participantError;
  }

  logStep("Participant marked as paid", { participant_id });

  // 2. Get group order details
  const { data: groupOrder, error: groupError } = await supabaseClient
    .from("group_orders")
    .select("*, events(title, banner_url, slug, starts_at, venue, city, organizer_id)")
    .eq("id", group_order_id)
    .single();

  if (groupError || !groupOrder) {
    logStep("Group order not found", { group_order_id });
    throw new Error("Group order not found");
  }

  // 3. Check if all participants have paid
  const { data: allParticipants, error: allError } = await supabaseClient
    .from("group_order_participants")
    .select("*")
    .eq("group_order_id", group_order_id);

  if (allError) {
    logStep("Error fetching participants", allError);
    throw allError;
  }

  const participantList = allParticipants as Array<{
    id: string;
    status: string;
    user_id: string | null;
    email: string;
    amount_cents: number;
    stripe_payment_intent_id: string | null;
  }> || [];
  
  const allPaid = participantList.every(p => p.status === 'paid');
  const paidCount = participantList.filter(p => p.status === 'paid').length;

  logStep("Participants status", { 
    total: participantList.length, 
    paid: paidCount, 
    allPaid 
  });

  // 4. If all paid, complete the group and create tickets
  if (allPaid && participantList.length > 0) {
    logStep("All participants paid - creating tickets for group");

    // Update group order status
    await supabaseClient
      .from("group_orders")
      .update({ status: 'completed' })
      .eq("id", group_order_id);

    // Create one order and tickets for each participant
    for (const participant of participantList) {
      const shortCode = generateShortCode();
      
      // Create individual order for each participant
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert({
          user_id: participant.user_id || groupOrder.creator_user_id,
          event_id: groupOrder.event_id,
          organizer_id: groupOrder.events?.organizer_id,
          amount_total_cents: participant.amount_cents,
          short_code: shortCode,
          status: 'completed',
          stripe_payment_intent_id: participant.stripe_payment_intent_id,
        })
        .select()
        .single();

      if (orderError || !order) {
        logStep("Error creating order for participant", { participant_id: participant.id, error: orderError });
        continue;
      }

      // Create ticket
      const serial = `${shortCode}-001`;
      const tokenHash = await generateTicketHash(serial, groupOrder.event_id);

      const { error: ticketError } = await supabaseClient
        .from("tickets")
        .insert({
          order_id: order.id,
          event_id: groupOrder.event_id,
          user_id: participant.user_id || groupOrder.creator_user_id,
          qr_token: serial,
          qr_hash: tokenHash,
          status: 'valid',
        });

      if (ticketError) {
        logStep("Error creating ticket for participant", { participant_id: participant.id, error: ticketError });
        continue;
      }

      logStep("Ticket created for participant", { 
        participant_id: participant.id, 
        order_id: order.id,
        email: participant.email 
      });

      // Send email to this participant
      try {
        await supabaseClient.functions.invoke('send-ticket-email', {
          body: { orderId: order.id }
        });
        logStep("Email sent to participant", { email: participant.email });
      } catch (emailErr) {
        logStep("Error sending email to participant (non-blocking)", { email: participant.email, error: emailErr });
      }
    }

    logStep("Group order completed - all tickets created and emails sent");
  } else {
    logStep("Waiting for remaining participants", { 
      remaining: participantList.length - paidCount 
    });
  }
}
