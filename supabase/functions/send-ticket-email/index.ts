import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import QRCode from "https://esm.sh/qrcode@1.5.4";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SEND-TICKET-EMAIL] ${step}`, details || "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { orderId } = await req.json();
    if (!orderId) {
      throw new Error("orderId required");
    }

    logStep("Request data", { orderId });

    // Fetch order with related data
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        id,
        short_code,
        amount_total_cents,
        user_id,
        events (
          title,
          venue,
          city,
          starts_at,
          banner_url
        ),
        tickets (
          id,
          qr_token,
          status
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order loaded", { orderId: order.id, ticketCount: order.tickets.length });

    // Get user email
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(order.user_id);
    if (userError || !user?.email) {
      throw new Error("User not found");
    }

    const customerEmail = user.email;
    logStep("User email found", { email: customerEmail });

    // Generate QR codes for each ticket
    const ticketPromises = order.tickets.map(async (ticket: any) => {
      const qrDataUrl = await QRCode.toDataURL(ticket.qr_token, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2,
      });
      return {
        id: ticket.id,
        qrCode: qrDataUrl.split(',')[1], // Get base64 part only
      };
    });

    const ticketsWithQR = await Promise.all(ticketPromises);
    logStep("QR codes generated", { count: ticketsWithQR.length });

    // Create HTML email with QR codes
    const event = order.events as any;
    const ticketHtml = ticketsWithQR.map((ticket, index) => `
      <div style="margin: 20px 0; padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0;">Billet ${index + 1}</h3>
        <img src="cid:qr${index}" alt="QR Code" style="width: 200px; height: 200px;" />
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Vos billets - ${event.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; margin-bottom: 10px;">🎉 Réservation confirmée !</h1>
            <p style="color: #666; font-size: 16px;">Vos billets pour ${event.title}</p>
          </div>
          
          ${event.banner_url ? `
            <img src="${event.banner_url}" alt="${event.title}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" />
          ` : ''}
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #1a1a1a;">Détails de l'événement</h2>
            <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${new Date(event.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin: 5px 0;"><strong>🕐 Heure :</strong> ${new Date(event.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p style="margin: 5px 0;"><strong>📍 Lieu :</strong> ${event.venue}, ${event.city}</p>
            <p style="margin: 5px 0;"><strong>🎫 Nombre de billets :</strong> ${order.tickets.length}</p>
            ${order.amount_total_cents > 0 ? `<p style="margin: 5px 0;"><strong>💰 Montant :</strong> ${(order.amount_total_cents / 100).toFixed(2)} €</p>` : '<p style="margin: 5px 0;"><strong>🆓 Entrée gratuite</strong></p>'}
            <p style="margin: 5px 0;"><strong>🔢 Code de commande :</strong> ${order.short_code}</p>
          </div>

          <h2 style="color: #1a1a1a;">Vos billets (QR Codes)</h2>
          <p style="color: #666;">Présentez ces QR codes à l'entrée de l'événement :</p>
          
          ${ticketHtml}

          <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Important :</strong> Conservez cet email. Ces QR codes sont uniques et vous serviront d'accès à l'événement.</p>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
            <p>Cet email a été envoyé automatiquement suite à votre réservation.</p>
          </div>
        </body>
      </html>
    `;

    // Prepare attachments for QR codes
    const attachments = ticketsWithQR.map((ticket, index) => ({
      filename: `qr-code-${index + 1}.png`,
      content: ticket.qrCode,
      content_id: `qr${index}`,
      disposition: 'inline',
    }));

    // Send email with Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Billetterie <onboarding@resend.dev>",
        to: [customerEmail],
        subject: `Vos billets pour ${event.title}`,
        html: emailHtml,
        attachments: attachments,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    logStep("Email sent successfully", { emailId: emailData.id });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
