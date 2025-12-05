import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[PAY-GROUP-SHARE] ${step}`, details ? JSON.stringify(details) : '');
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { shareCode, participantId } = await req.json();
    
    if (!shareCode) throw new Error("Missing share code");

    // Get group order
    const { data: groupOrder, error: groupError } = await supabaseClient
      .from('group_orders')
      .select('*, events(*)')
      .eq('share_code', shareCode)
      .single();

    if (groupError || !groupOrder) {
      throw new Error("Group order not found");
    }

    if (groupOrder.status !== 'pending') {
      throw new Error(`Group order is ${groupOrder.status}`);
    }

    if (new Date(groupOrder.expires_at) < new Date()) {
      throw new Error("Group order has expired");
    }

    logStep("Group order found", { groupOrderId: groupOrder.id, eventTitle: groupOrder.events?.title });

    // Find or create participant entry for this user
    let participant;
    
    if (participantId) {
      // Specific participant joining
      const { data: existingParticipant } = await supabaseClient
        .from('group_order_participants')
        .select('*')
        .eq('id', participantId)
        .single();
      
      if (existingParticipant && existingParticipant.status === 'pending') {
        // Link user to this participant slot
        await supabaseClient
          .from('group_order_participants')
          .update({ user_id: user.id })
          .eq('id', participantId);
        
        participant = { ...existingParticipant, user_id: user.id };
      }
    } else {
      // Find participant by email
      const { data: emailParticipant } = await supabaseClient
        .from('group_order_participants')
        .select('*')
        .eq('group_order_id', groupOrder.id)
        .ilike('email', user.email || '')
        .single();

      if (emailParticipant) {
        participant = emailParticipant;
        if (!emailParticipant.user_id) {
          await supabaseClient
            .from('group_order_participants')
            .update({ user_id: user.id })
            .eq('id', emailParticipant.id);
        }
      }
    }

    if (!participant) {
      throw new Error("You are not a participant in this group order");
    }

    if (participant.status === 'paid') {
      throw new Error("You have already paid for this group order");
    }

    logStep("Participant found", { participantId: participant.id, amount: participant.amount_cents });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get organizer's Stripe account for Connect
    const { data: organizer } = await supabaseClient
      .from('organizers')
      .select('stripe_account_id, commission_rate_bps, commission_fixed_eur')
      .eq('id', groupOrder.events.organizer_id)
      .single();

    const origin = req.headers.get("origin") || "https://lergmodntwjeyljgzdsh.lovable.app";

    // Calculate application fee
    const applicationFee = organizer?.stripe_account_id 
      ? Math.round((participant.amount_cents * (organizer.commission_rate_bps || 110)) / 10000) + ((organizer.commission_fixed_eur || 0) * 100)
      : 0;

    // Create Stripe Checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${groupOrder.events.title} - Part de groupe`,
              description: `1 place sur ${groupOrder.total_tickets} (Group Pay)`,
            },
            unit_amount: participant.amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/group-pay/${shareCode}?success=true&participant=${participant.id}`,
      cancel_url: `${origin}/group-pay/${shareCode}?cancelled=true`,
      metadata: {
        group_order_id: groupOrder.id,
        participant_id: participant.id,
        user_id: user.id,
        type: 'group_pay',
      },
    };

    // Add Stripe Connect if organizer has account
    if (organizer?.stripe_account_id) {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: organizer.stripe_account_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
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
