import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId required");

    // 1. Récupération des données
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        id, short_code, amount_total_cents, user_id,
        events (title, venue, city, starts_at, banner_url, slug),
        tickets (id, qr_token, status)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(order.user_id);
    if (userError || !user?.email) throw new Error("User email not found");

    // 2. Génération QR Codes (Noir sur Blanc pour lisibilité max)
    const ticketsWithQR = await Promise.all(order.tickets.map(async (ticket: any) => {
      const qrDataUrl = await QRCode.toDataURL(ticket.qr_token, {
        errorCorrectionLevel: 'M',
        width: 400,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      return { ...ticket, qrBase64: qrDataUrl.split(',')[1] };
    }));

    // 3. Template Silicon Valley - Épuré & Pro
    const event = order.events as any;
    const eventDate = new Date(event.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const eventTime = new Date(event.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const ticketsHtml = ticketsWithQR.map((ticket, index) => `
      <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f0f0f0; padding-bottom: 12px;">
          <span style="color: #000000; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Billet d'entrée</span>
          <span style="color: #888888; font-size: 12px;">${index + 1} / ${ticketsWithQR.length}</span>
        </div>
        <div style="text-align: center; padding: 16px 0;">
          <img src="cid:qr${index}" alt="QR Code" style="width: 160px; height: 160px;" />
        </div>
        <div style="margin-top: 12px; text-align: center; border-top: 1px solid #f0f0f0; padding-top: 12px;">
          <p style="color: #888888; font-size: 11px; margin: 0; font-family: 'SF Mono', Monaco, monospace;">${ticket.qr_token}</p>
        </div>
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vos billets - ${event.title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Confirmation</p>
            <h1 style="color: #000000; font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.5px;">Vos billets sont prêts</h1>
          </div>

          <!-- Event Card -->
          <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            ${event.banner_url 
              ? `<img src="${event.banner_url}" alt="${event.title}" style="width: 100%; height: 180px; object-fit: cover;" />` 
              : `<div style="width: 100%; height: 100px; background: #000000; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 20px; font-weight: 600; letter-spacing: 2px;">SPARK</span>
                </div>`
            }
            
            <div style="padding: 24px;">
              <h2 style="color: #000000; font-size: 20px; font-weight: 600; margin: 0 0 4px 0;">${event.title}</h2>
              <p style="color: #888888; font-size: 14px; margin: 0 0 16px 0;">${event.venue}, ${event.city}</p>
              
              <div style="display: flex; gap: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
                <div>
                  <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Date</p>
                  <p style="color: #000000; font-size: 14px; font-weight: 500; margin: 0;">${eventDate}</p>
                </div>
                <div>
                  <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Heure</p>
                  <p style="color: #000000; font-size: 14px; font-weight: 500; margin: 0;">${eventTime}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tickets -->
          ${ticketsHtml}

          <!-- Order Reference -->
          <div style="text-align: center; margin-top: 24px; padding: 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5;">
            <p style="color: #888888; font-size: 12px; margin: 0;">
              Commande <span style="color: #000000; font-weight: 500; font-family: 'SF Mono', Monaco, monospace;">#${order.short_code}</span>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #888888; font-size: 12px; margin: 0;">Spark</p>
            <p style="color: #bbbbbb; font-size: 11px; margin: 4px 0 0 0;">Billetterie événementielle</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Envoi
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    // Pièces jointes (QR Code images)
    const attachments = ticketsWithQR.map((ticket, index) => ({
      filename: `spark-ticket-${index + 1}.png`,
      content: ticket.qrBase64,
      content_id: `qr${index}`,
      disposition: 'inline',
    }));

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Spark Billets <onboarding@resend.dev>",
        to: [user.email],
        subject: `Vos billets : ${event.title}`,
        html: emailHtml,
        attachments: attachments,
      }),
    });

    if (!emailResponse.ok) {
      console.error("Resend Error:", await emailResponse.text());
      throw new Error("Erreur lors de l'envoi du billet");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
