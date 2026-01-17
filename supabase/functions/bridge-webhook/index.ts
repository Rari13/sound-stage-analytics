import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hook-signature",
};

const logStep = (step: string, details?: any) => {
  console.log(`[BRIDGE-WEBHOOK] ${step}`, details || "");
};

// Generate HMAC-SHA256 signature for validation
const computeHMAC = async (body: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Generate secure ticket hash
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
    const bodyText = await req.text();
    const event = JSON.parse(bodyText);
    
    logStep("Received event", { type: event.type });
    
    // HMAC signature validation (recommended for production)
    const signature = req.headers.get("x-hook-signature");
    const webhookSecret = Deno.env.get("BRIDGE_WEBHOOK_SECRET");
    
    if (webhookSecret) {
      if (!signature) {
        logStep("Missing signature header - rejecting request");
        return new Response("Missing signature", { status: 401, headers: corsHeaders });
      }
      
      const expectedSignature = await computeHMAC(bodyText, webhookSecret);
      if (signature !== expectedSignature) {
        logStep("Invalid signature - rejecting request");
        return new Response("Invalid signature", { status: 401, headers: corsHeaders });
      }
      
      logStep("Signature validated successfully");
    } else {
      logStep("BRIDGE_WEBHOOK_SECRET not configured - skipping signature validation (NOT RECOMMENDED FOR PRODUCTION)");
    }
    
    // Process successful payment events
    if (event.type === "payment.transaction.updated" && event.data?.status === "successful") {
      logStep("Processing successful payment");
      
      const bridgePaymentId = event.data.payment_link_id || event.data.transaction_id;
      
      if (!bridgePaymentId) {
        logStep("No payment ID found in event");
        return new Response("No payment ID", { status: 400, headers: corsHeaders });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // 1. Find the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, events(title, banner_url, slug, starts_at, venue, city)")
        .eq("stripe_checkout_session_id", bridgePaymentId)
        .maybeSingle();

      if (orderError) {
        logStep("Error fetching order", orderError);
        return new Response("Database error", { status: 500, headers: corsHeaders });
      }

      if (!order) {
        logStep("Order not found for ID", { bridgePaymentId });
        return new Response("Order not found", { status: 404, headers: corsHeaders });
      }

      if (order.status === "completed") {
        logStep("Order already completed", { orderId: order.id });
        return new Response("Already processed", { status: 200, headers: corsHeaders });
      }

      // 2. Check if tickets already exist for this order
      const { data: existingTickets } = await supabase
        .from("tickets")
        .select("id")
        .eq("order_id", order.id);

      // 3. Create tickets if they don't exist yet
      if (!existingTickets || existingTickets.length === 0) {
        logStep("Creating tickets for order", { orderId: order.id });
        
        // For Bridge, we assume 1 ticket per order unless specified otherwise
        // In a real scenario, you'd get ticket count from the order metadata or event data
        const ticketCount = 1;
        const tickets: any[] = [];
        
        for (let i = 1; i <= ticketCount; i++) {
          const serial = `${order.short_code}-${String(i).padStart(3, '0')}`;
          const tokenHash = await generateTicketHash(serial, order.event_id);
          
          tickets.push({
            order_id: order.id,
            event_id: order.event_id,
            user_id: order.user_id,
            qr_token: serial,
            qr_hash: tokenHash,
            status: 'valid',
          });
        }

        const { error: ticketsError } = await supabase
          .from("tickets")
          .insert(tickets);

        if (ticketsError) {
          logStep("Error creating tickets", ticketsError);
          return new Response("Error creating tickets", { status: 500, headers: corsHeaders });
        }

        logStep("Tickets created", { count: tickets.length });
      } else {
        logStep("Tickets already exist", { count: existingTickets.length });
      }

      // 4. Update order status to completed
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);

      if (updateError) {
        logStep("Error updating order", updateError);
        return new Response("Update error", { status: 500, headers: corsHeaders });
      }

      logStep("Order marked as completed", { orderId: order.id });

      // 5. Send ticket email (now that tickets exist)
      try {
        const { error: ticketError } = await supabase.functions.invoke('send-ticket-email', {
          body: { orderId: order.id }
        });

        if (ticketError) {
          logStep("Error sending tickets (non-blocking)", ticketError);
        } else {
          logStep("Tickets sent for order", { orderId: order.id });
        }
      } catch (emailErr) {
        logStep("Exception sending email (non-blocking)", emailErr);
      }
    } else {
      logStep("Ignoring event type", { type: event.type, status: event.data?.status });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logStep("ERROR", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
