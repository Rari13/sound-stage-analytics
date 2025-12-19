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

    // 3. Le Template "Electric Speed Noir"
    const event = order.events as any;
    const eventDate = new Date(event.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const eventTime = new Date(event.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const ticketsHtml = ticketsWithQR.map((ticket, index) => `
      <div style="background: linear-gradient(145deg, #111111, #0a0a0a); border-radius: 16px; padding: 24px; margin: 16px 0; border: 1px solid #222; box-shadow: 0 8px 32px rgba(0, 102, 255, 0.15);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="color: #00ccff; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Accès Rapide</span>
          <span style="color: #666; font-size: 12px;">Billet ${index + 1}/${ticketsWithQR.length}</span>
        </div>
        <div style="text-align: center; background: #ffffff; border-radius: 12px; padding: 20px;">
          <img src="cid:qr${index}" alt="QR Code" style="width: 180px; height: 180px;" />
        </div>
        <div style="margin-top: 16px; text-align: center;">
          <p style="color: #555; font-size: 11px; margin: 0; font-family: monospace;">ID: ${ticket.qr_token}</p>
          <div style="display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;">
            <div style="width: 8px; height: 8px; background: #00ff88; border-radius: 50%; box-shadow: 0 0 8px #00ff88;"></div>
            <span style="color: #00ff88; font-size: 12px;">Prêt à scanner</span>
          </div>
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
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 480px; margin: 0 auto; padding: 0;">
          <!-- Header avec bannière -->
          <div style="position: relative; overflow: hidden;">
            ${event.banner_url 
              ? `<img src="${event.banner_url}" alt="${event.title}" style="width: 100%; height: 200px; object-fit: cover;" />` 
              : `<div style="width: 100%; height: 200px; background: linear-gradient(135deg, #0044cc 0%, #00ccff 100%); display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 28px; font-weight: bold; letter-spacing: 4px;">SPARK EVENTS</span>
                </div>`
            }
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 80px; background: linear-gradient(to top, #050505, transparent);"></div>
          </div>
          
          <!-- Contenu principal -->
          <div style="padding: 24px 20px; background: #050505;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">${event.title}</h1>
              <p style="color: #00ccff; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${eventDate} • ${eventTime}</p>
              <p style="color: #888; font-size: 13px; margin: 8px 0 0 0;">${event.venue}, ${event.city}</p>
            </div>

            ${ticketsHtml}

            <div style="text-align: center; margin-top: 24px; padding: 16px; background: #111; border-radius: 12px; border: 1px solid #222;">
              <p style="color: #666; font-size: 12px; margin: 0;">Réf. Commande <span style="color: #00ccff; font-family: monospace;">${order.short_code}</span></p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px; text-align: center; background: linear-gradient(to bottom, #050505, #0a0a0a);">
            <p style="color: #555; font-size: 11px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 2px;">Billetterie propulsée par SPARK</p>
            <p style="color: #333; font-size: 10px; margin: 0;">Le système de paiement le plus rapide pour les organisateurs.</p>
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
        subject: `⚡ Billet : ${event.title}`,
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
