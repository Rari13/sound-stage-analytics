import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Auth User
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("[TOGGLE-TICKET-RESALE] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Non autorisé" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { ticketId, action, resalePrice } = await req.json();
    // action = 'sell' | 'cancel_sell' | 'refund_request'

    console.log("[TOGGLE-TICKET-RESALE] User:", user.id, "Action:", action, "Ticket:", ticketId);

    // 2. Récupérer le ticket et l'événement associé
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id, 
        status,
        is_for_sale,
        original_price_cents,
        user_id,
        order_id,
        event_id,
        events(id, title, ends_at, organizer_id)
      `)
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      console.error("[TOGGLE-TICKET-RESALE] Ticket error:", ticketError);
      return new Response(JSON.stringify({ error: "Ticket introuvable" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (ticket.status !== 'valid') {
      return new Response(JSON.stringify({ error: "Ce billet n'est plus valide" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const event = ticket.events as unknown as { id: string; title: string; ends_at: string; organizer_id: string };
    const eventEndDate = new Date(event.ends_at);
    const now = new Date();
    const isEventFinished = now > eventEndDate;

    console.log("[TOGGLE-TICKET-RESALE] Event ends:", eventEndDate, "Now:", now, "Finished:", isEventFinished);

    // 3. LOGIQUE METIER
    
    if (action === 'sell') {
      if (isEventFinished) {
        return new Response(JSON.stringify({ 
          error: "L'événement est terminé, impossible de revendre. Vous pouvez demander un remboursement." 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      // Prix de revente plafonné au prix d'achat (anti-scalping)
      const maxPrice = ticket.original_price_cents || resalePrice || 0;
      const finalResalePrice = Math.min(resalePrice || maxPrice, maxPrice);
      
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          is_for_sale: true, 
          resale_price_cents: finalResalePrice
        })
        .eq('id', ticketId);

      if (updateError) {
        console.error("[TOGGLE-TICKET-RESALE] Update error:", updateError);
        return new Response(JSON.stringify({ error: "Erreur lors de la mise en vente" }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      console.log("[TOGGLE-TICKET-RESALE] Ticket put on sale successfully");
      return new Response(JSON.stringify({ 
        success: true,
        message: "Billet mis en vente sur la marketplace" 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (action === 'cancel_sell') {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          is_for_sale: false, 
          resale_price_cents: null
        })
        .eq('id', ticketId);

      if (updateError) {
        console.error("[TOGGLE-TICKET-RESALE] Cancel sale error:", updateError);
        return new Response(JSON.stringify({ error: "Erreur lors de l'annulation" }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      console.log("[TOGGLE-TICKET-RESALE] Sale cancelled successfully");
      return new Response(JSON.stringify({ 
        success: true,
        message: "Mise en vente annulée" 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (action === 'refund_request') {
      if (!isEventFinished) {
        return new Response(JSON.stringify({ 
          error: "L'événement n'est pas terminé. Veuillez utiliser l'option de revente." 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Vérifier si une demande existe déjà
      const { data: existingRequest } = await supabase
        .from('refund_requests')
        .select('id')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (existingRequest) {
        return new Response(JSON.stringify({ 
          error: "Une demande de remboursement existe déjà pour ce billet" 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const { error: insertError } = await supabase
        .from('refund_requests')
        .insert({
          ticket_id: ticketId,
          order_id: ticket.order_id,
          event_id: ticket.event_id,
          user_id: user.id,
          organizer_id: event.organizer_id,
          reason: 'Événement terminé - Demande utilisateur',
          status: 'pending'
        });

      if (insertError) {
        console.error("[TOGGLE-TICKET-RESALE] Refund request error:", insertError);
        return new Response(JSON.stringify({ error: "Erreur lors de la demande de remboursement" }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      console.log("[TOGGLE-TICKET-RESALE] Refund request created successfully");
      return new Response(JSON.stringify({ 
        success: true,
        message: "Demande de remboursement envoyée" 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[TOGGLE-TICKET-RESALE] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
