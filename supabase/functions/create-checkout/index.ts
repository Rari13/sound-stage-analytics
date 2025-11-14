import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}`, details || "");
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

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let customerEmail: string | null = null;

    // Optional auth - allow guest checkout
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (user) {
        userId = user.id;
        customerEmail = user.email || null;
        logStep("User authenticated", { userId, email: customerEmail });
      }
    }

    const { eventId, items, customerEmail: providedEmail } = await req.json();
    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("eventId and items array required");
    }

    // Use provided email if user not authenticated
    if (!customerEmail && providedEmail) {
      customerEmail = providedEmail;
    }

    if (!customerEmail) {
      throw new Error("Email required for checkout");
    }

    logStep("Request data", { eventId, items, customerEmail });

    // Fetch event
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, title, slug, organizer_id, banner_url")
      .eq("id", eventId)
      .single();

    if (eventError || !event) throw new Error("Event not found");
    logStep("Event loaded", { eventId: event.id, title: event.title });

    // Fetch organizer with Connect account and fees
    const { data: organizer, error: orgError } = await supabaseClient
      .from("organizers")
      .select("id, stripe_account_id, commission_rate_bps, commission_fixed_eur")
      .eq("id", event.organizer_id)
      .single();

    if (orgError || !organizer) throw new Error("Organizer not found");
    if (!organizer.stripe_account_id) {
      throw new Error("Organizer has not configured Stripe Connect");
    }

    logStep("Organizer loaded", { 
      organizerId: organizer.id, 
      hasStripeAccount: !!organizer.stripe_account_id,
      commissionRateBps: organizer.commission_rate_bps,
      commissionFixedEur: organizer.commission_fixed_eur
    });

    // Fetch requested price tiers
    const tierIds = items.map((item: any) => item.tierId);
    const { data: tiers, error: tiersError } = await supabaseClient
      .from("price_tiers")
      .select("id, name, price_cents, quota")
      .in("id", tierIds)
      .eq("event_id", eventId);

    if (tiersError || !tiers) throw new Error("Price tiers not found");
    logStep("Tiers loaded", { count: tiers.length });

    // Check stock and calculate totals
    let subtotalCents = 0;
    let totalQty = 0;
    const lineItems: any[] = [];

    for (const item of items) {
      const tier = tiers.find(t => t.id === item.tierId);
      if (!tier) throw new Error(`Tier ${item.tierId} not found`);

      const qty = parseInt(item.qty);
      if (isNaN(qty) || qty < 1) throw new Error(`Invalid quantity for tier ${tier.name}`);

      // Check stock availability (simplified - in production check qty_sold)
      if (tier.quota && qty > tier.quota) {
        throw new Error(`Insufficient stock for ${tier.name}. Only ${tier.quota} available.`);
      }

      subtotalCents += tier.price_cents * qty;
      totalQty += qty;

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `${event.title} - ${tier.name}`,
            images: event.banner_url ? [event.banner_url] : [],
          },
          unit_amount: tier.price_cents,
        },
        quantity: qty,
      });
    }

    logStep("Stock checked and totals calculated", { subtotalCents, totalQty });

    // Calculate application fee
    const feePct = (organizer.commission_rate_bps || 110) / 100; // Convert bps to percentage
    const feeFixedCentsPerTicket = Math.round((organizer.commission_fixed_eur || 0) * 100);
    const applicationFeeAmount = Math.floor(subtotalCents * (feePct / 100)) + (feeFixedCentsPerTicket * totalQty);

    logStep("Application fee calculated", { 
      feePct, 
      feeFixedCentsPerTicket, 
      applicationFeeAmount 
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:8080";

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/order/success?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/event/${event.slug}`,
      payment_intent_data: {
        on_behalf_of: organizer.stripe_account_id,
        transfer_data: {
          destination: organizer.stripe_account_id,
        },
        application_fee_amount: applicationFeeAmount,
      },
      metadata: {
        event_id: eventId,
        organizer_id: organizer.id,
        user_id: userId || "guest",
      },
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create order record (pending)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        organizer_id: organizer.id,
        user_id: userId || null,
        stripe_checkout_session_id: session.id,
        status: "pending",
        amount_total_cents: subtotalCents,
        application_fee_cents: applicationFeeAmount,
        currency: "E",
      })
      .select()
      .single();

    if (orderError) {
      logStep("Error creating order", orderError);
      // Continue anyway - webhook will handle it
    } else {
      logStep("Order created", { orderId: order.id });
    }

    return new Response(
      JSON.stringify({ url: session.url }),
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
        status: 500,
      }
    );
  }
});
