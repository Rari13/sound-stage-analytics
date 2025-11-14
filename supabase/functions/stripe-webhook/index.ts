import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details || "");
};

const generateTicketHash = (serial: string, eventId: string): string => {
  const secret = Deno.env.get("TICKET_SECRET") || "default-secret-change-me";
  const data = `${serial}.${eventId}.${secret}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  return crypto.subtle.digest("SHA-256", dataBuffer)
    .then(hashBuffer => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
};

const generateQRCode = async (token: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });
  } catch (error) {
    logStep("QR generation error", error);
    throw error;
  }
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

      // Generate QR codes for tickets
      const ticketsWithQR = await Promise.all(
        createdTickets.map(async (ticket) => ({
          ...ticket,
          qrDataUrl: await generateQRCode(ticket.qr_token),
        }))
      );

      logStep("QR codes generated");

      // Send email with all tickets
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      const ticketRows = ticketsWithQR.map(ticket => `
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #eee;">
            <img src="${ticket.qrDataUrl}" alt="QR Code" style="width: 150px; height: 150px;" />
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #eee;">
            <strong>${ticket.qr_token}</strong>
          </td>
        </tr>
      `).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Vos billets</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${order.events?.banner_url ? `
              <img src="${order.events.banner_url}" alt="Event banner" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />
            ` : ''}
            
            <h1 style="color: #1a1a1a; margin-bottom: 10px;">Confirmation de commande</h1>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">${order.events?.title || 'Événement'}</h2>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(order.events?.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin: 5px 0;"><strong>Lieu:</strong> ${order.events?.venue}, ${order.events?.city}</p>
              <p style="margin: 5px 0;"><strong>Code commande:</strong> ${order.short_code}</p>
            </div>

            <h3 style="margin-top: 30px;">Vos billets (${ticketsWithQR.length})</h3>
            <p>Présentez ces QR codes à l'entrée de l'événement :</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #1a1a1a; color: white;">
                  <th style="padding: 15px; text-align: left;">QR Code</th>
                  <th style="padding: 15px; text-align: left;">Numéro de billet</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
              </tbody>
            </table>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0;"><strong>Important:</strong> Conservez cet email. Vous devrez présenter vos QR codes à l'entrée de l'événement.</p>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Merci pour votre achat ! Si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
          </body>
        </html>
      `;

      const { error: emailError } = await resend.emails.send({
        from: 'Billets <onboarding@resend.dev>',
        to: [session.customer_details?.email || session.customer_email || ''],
        subject: `Vos billets pour ${order.events?.title}`,
        html: emailHtml,
      });

      if (emailError) {
        logStep("Email error (non-blocking)", emailError);
        // Don't throw - tickets are created, email is secondary
      } else {
        logStep("Email sent successfully");
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
