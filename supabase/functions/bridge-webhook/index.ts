import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hook-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event = await req.json();
    
    console.log("[BRIDGE-WEBHOOK] Received event:", event.type);
    
    // Vérification de sécurité (Signature ou Token Secret)
    // Bridge envoie un header X-Hook-Signature que vous devez valider en prod
    const signature = req.headers.get("x-hook-signature");
    console.log("[BRIDGE-WEBHOOK] Signature present:", !!signature);
    
    // On s'intéresse aux événements de paiement réussi
    if (event.type === "payment.transaction.updated" && event.data?.status === "successful") {
      console.log("[BRIDGE-WEBHOOK] Processing successful payment");
      
      const bridgePaymentId = event.data.payment_link_id || event.data.transaction_id;
      
      if (!bridgePaymentId) {
        console.log("[BRIDGE-WEBHOOK] No payment ID found in event");
        return new Response("No payment ID", { status: 400 });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // 1. Retrouver la commande
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("stripe_checkout_session_id", bridgePaymentId)
        .maybeSingle();

      if (orderError) {
        console.error("[BRIDGE-WEBHOOK] Error fetching order:", orderError);
        return new Response("Database error", { status: 500 });
      }

      if (!order) {
        console.log("[BRIDGE-WEBHOOK] Order not found for ID:", bridgePaymentId);
        return new Response("Order not found", { status: 404 });
      }

      if (order.status === "completed") {
        console.log("[BRIDGE-WEBHOOK] Order already completed:", order.id);
        return new Response("Already processed", { status: 200 });
      }

      // 2. Passer la commande en "Payé"
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);

      if (updateError) {
        console.error("[BRIDGE-WEBHOOK] Error updating order:", updateError);
        return new Response("Update error", { status: 500 });
      }

      console.log("[BRIDGE-WEBHOOK] Order marked as completed:", order.id);

      // 3. Générer les billets via la fonction existante
      const { error: ticketError } = await supabase.functions.invoke('send-ticket-email', {
        body: { orderId: order.id }
      });

      if (ticketError) {
        console.error("[BRIDGE-WEBHOOK] Error sending tickets:", ticketError);
      } else {
        console.log("[BRIDGE-WEBHOOK] Tickets sent for order:", order.id);
      }
    } else {
      console.log("[BRIDGE-WEBHOOK] Ignoring event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[BRIDGE-WEBHOOK] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
