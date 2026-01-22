import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-GROUP-ORDER] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { eventId, priceTierId, totalTickets, participantEmails } = await req.json();
    
    if (!eventId || !priceTierId || !totalTickets || !participantEmails?.length) {
      throw new Error("Missing required fields: eventId, priceTierId, totalTickets, participantEmails");
    }

    if (participantEmails.length !== totalTickets) {
      throw new Error("Number of participant emails must match total tickets");
    }

    logStep("Request data", { eventId, priceTierId, totalTickets, participantCount: participantEmails.length });

    // Get price tier info
    const { data: priceTier, error: tierError } = await supabaseClient
      .from('price_tiers')
      .select('*, events(*)')
      .eq('id', priceTierId)
      .single();

    if (tierError || !priceTier) {
      throw new Error("Price tier not found");
    }

    const pricePerTicket = priceTier.price_cents;
    logStep("Price tier found", { name: priceTier.name, pricePerTicket });

    // Create the group order
    const { data: groupOrder, error: groupError } = await supabaseClient
      .from('group_orders')
      .insert({
        event_id: eventId,
        creator_user_id: user.id,
        total_tickets: totalTickets,
        price_per_ticket_cents: pricePerTicket,
      })
      .select()
      .single();

    if (groupError || !groupOrder) {
      logStep("Error creating group order", groupError);
      throw new Error("Failed to create group order");
    }

    logStep("Group order created", { groupOrderId: groupOrder.id, shareCode: groupOrder.share_code });

    // Add participants (creator first, then others)
    const participants = participantEmails.map((email: string) => ({
      group_order_id: groupOrder.id,
      email: email.toLowerCase().trim(),
      amount_cents: pricePerTicket,
      user_id: email.toLowerCase() === user.email?.toLowerCase() ? user.id : null,
    }));

    const { error: participantsError } = await supabaseClient
      .from('group_order_participants')
      .insert(participants);

    if (participantsError) {
      logStep("Error adding participants", participantsError);
      throw new Error("Failed to add participants");
    }

    logStep("Participants added", { count: participants.length });

    // Generate share URL - use PUBLIC_URL env var or fallback
    const origin = Deno.env.get("PUBLIC_URL") || "https://spark-events-analytics.vercel.app";
    const shareUrl = `${origin}/group-pay/${groupOrder.share_code}`;

    return new Response(
      JSON.stringify({
        success: true,
        groupOrderId: groupOrder.id,
        shareCode: groupOrder.share_code,
        shareUrl,
        totalAmount: pricePerTicket * totalTickets,
        pricePerPerson: pricePerTicket,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : "Unknown error" });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
