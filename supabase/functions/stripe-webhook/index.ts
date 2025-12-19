import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      logStep("Checkout session completed", { sessionId: session.id });

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

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
      const tickets: any[] = [];
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
            qr_token: serial, // Store serial as token for now
            qr_hash: tokenHash,
            status: 'valid',
          });

          serialCounter++;
        }
      }

      logStep("Tickets prepared", { count: tickets.length });

      // Transaction: update order + create tickets
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

      logStep("Order updated and tickets created", { ticketCount: createdTickets.length });

      // Appel au moteur d'email centralisé (Design Midnight Speed)
      try {
        const { error: emailFunctionError } = await supabaseClient.functions.invoke('send-ticket-email', {
          body: { orderId: order.id }
        });

        if (emailFunctionError) {
          logStep("Erreur envoi email (non-bloquant)", emailFunctionError);
        } else {
          logStep("Email envoyé via le moteur centralisé (Design Néon)");
        }
      } catch (emailErr) {
        logStep("Exception envoi email (non-bloquant)", emailErr);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logStep("Payment failed", { id: paymentIntent.id });
      
      // Update order status to failed
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

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
