import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Pricing Strategy Configuration
const PRICING_STRATEGY = {
  starter: { percent: 0.05, fixed: 99 },  // 5% + 0.99€
  pro: { percent: 0, fixed: 99 },          // 0% + 0.99€
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

    const { eventId, items, customerEmail: providedEmail, promoCode } = await req.json();
    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("eventId and items array required");
    }

    if (!customerEmail && providedEmail) {
      customerEmail = providedEmail;
    }

    if (!customerEmail) {
      throw new Error("Email required for checkout");
    }

    logStep("Request data", { eventId, items, customerEmail, promoCode: promoCode?.code });

    // Validate promo code if provided
    let promoDiscount = 0;
    let promoCodeId: string | null = null;
    let promoDiscountType: string | null = null;
    let promoDiscountValue: number | null = null;

    if (promoCode && promoCode.id) {
      // Re-validate promo code server-side
      const { data: promoData, error: promoError } = await supabaseClient
        .from("promo_codes")
        .select("id, code, discount_type, discount_value, event_id, usage_count, usage_limit, starts_at, expires_at, is_active")
        .eq("id", promoCode.id)
        .single();

      if (!promoError && promoData && promoData.is_active) {
        const now = new Date();
        const isValidEvent = !promoData.event_id || promoData.event_id === eventId;
        const isWithinUsage = !promoData.usage_limit || promoData.usage_count < promoData.usage_limit;
        const isAfterStart = !promoData.starts_at || new Date(promoData.starts_at) <= now;
        const isBeforeExpiry = !promoData.expires_at || new Date(promoData.expires_at) > now;

        if (isValidEvent && isWithinUsage && isAfterStart && isBeforeExpiry) {
          promoCodeId = promoData.id;
          promoDiscountType = promoData.discount_type;
          promoDiscountValue = promoData.discount_value;
          logStep("Promo code validated", { code: promoData.code, type: promoDiscountType, value: promoDiscountValue });
        } else {
          logStep("Promo code invalid", { reason: "conditions not met" });
        }
      }
    }

    // Fetch event with organizer
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, title, slug, organizer_id, banner_url")
      .eq("id", eventId)
      .single();

    if (eventError || !event) throw new Error("Event not found");
    logStep("Event loaded", { eventId: event.id, title: event.title });

    // Fetch organizer with Connect account and custom fees
    const { data: organizer, error: orgError } = await supabaseClient
      .from("organizers")
      .select("id, stripe_account_id, custom_commission_rate_bps, custom_commission_fixed_cents")
      .eq("id", event.organizer_id)
      .single();

    if (orgError || !organizer) throw new Error("Organizer not found");
    if (!organizer.stripe_account_id) {
      throw new Error("Organizer has not configured Stripe Connect");
    }

    // Fetch organizer subscription
    const { data: subscriptionData } = await supabaseClient
      .from("organizer_subscriptions")
      .select("plan_type, status")
      .eq("organizer_id", organizer.id)
      .eq("status", "active")
      .maybeSingle();

    const isPremium = subscriptionData?.plan_type === 'premium';
    logStep("Subscription status", { isPremium });

    // PRICING LOGIC - Determine fees
    let feesConfig = PRICING_STRATEGY.starter; // Default: Starter (5% + 0.99€)
    let pricingSource = 'starter';

    // Priority 1: Custom negotiated rates
    if (organizer.custom_commission_rate_bps !== null && organizer.custom_commission_fixed_cents !== null) {
      feesConfig = {
        percent: organizer.custom_commission_rate_bps / 10000,
        fixed: organizer.custom_commission_fixed_cents
      };
      pricingSource = 'custom_negotiated';
    } 
    // Priority 2: Pro plan (0% + 0.99€)
    else if (isPremium) {
      feesConfig = PRICING_STRATEGY.pro;
      pricingSource = 'pro';
    }

    logStep("Fees configuration", { feesConfig, pricingSource });

    // Fetch requested price tiers
    const tierIds = items.map((item: any) => item.tierId);
    const { data: tiers, error: tiersError } = await supabaseClient
      .from("price_tiers")
      .select("id, name, price_cents, quota")
      .in("id", tierIds)
      .eq("event_id", eventId);

    if (tiersError || !tiers) throw new Error("Price tiers not found");
    logStep("Tiers loaded", { count: tiers.length });

    // Calculate totals with dynamic fees
    let subtotalCents = 0;
    let totalApplicationFee = 0;
    let totalQty = 0;

    for (const item of items) {
      const tier = tiers.find(t => t.id === item.tierId);
      if (!tier) throw new Error(`Tier ${item.tierId} not found`);

      const qty = parseInt(item.qty);
      if (isNaN(qty) || qty < 1) throw new Error(`Invalid quantity for tier ${tier.name}`);

      if (tier.quota && qty > tier.quota) {
        throw new Error(`Insufficient stock for ${tier.name}. Only ${tier.quota} available.`);
      }

      subtotalCents += tier.price_cents * qty;
      totalQty += qty;
    }

    // Apply promo discount
    if (promoCodeId && promoDiscountType && promoDiscountValue !== null) {
      if (promoDiscountType === 'percentage') {
        promoDiscount = Math.round(subtotalCents * (promoDiscountValue / 100));
      } else {
        promoDiscount = promoDiscountValue; // Fixed amount in cents
      }
      promoDiscount = Math.min(promoDiscount, subtotalCents); // Cap at subtotal
      logStep("Promo discount calculated", { promoDiscount, subtotalCents });
    }

    const discountedSubtotal = subtotalCents - promoDiscount;

    // Calculate fees on discounted amount
    const lineItems: any[] = [];
    for (const item of items) {
      const tier = tiers.find(t => t.id === item.tierId);
      if (!tier) continue;

      const qty = parseInt(item.qty);
      
      // Calculate proportional discount per ticket
      const ticketSubtotal = tier.price_cents * qty;
      const ticketDiscount = subtotalCents > 0 
        ? Math.round(promoDiscount * (ticketSubtotal / subtotalCents)) 
        : 0;
      const discountedTicketPrice = Math.max(0, tier.price_cents - Math.round(ticketDiscount / qty));

      // Calculate fee per ticket based on discounted price
      const feePerTicket = Math.round((discountedTicketPrice * feesConfig.percent) + feesConfig.fixed);
      const priceWithFee = discountedTicketPrice + feePerTicket;

      totalApplicationFee += feePerTicket * qty;

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `${event.title} - ${tier.name}`,
            description: promoDiscount > 0 
              ? `Billet avec réduction appliquée + Frais de service`
              : `Billet : ${(tier.price_cents/100).toFixed(2)}€ + Frais de service`,
            images: event.banner_url ? [event.banner_url] : [],
          },
          unit_amount: priceWithFee,
        },
        quantity: qty,
      });
    }

    logStep("Totals calculated", { 
      subtotalCents, 
      promoDiscount, 
      discountedSubtotal, 
      totalApplicationFee, 
      totalQty, 
      pricingSource 
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:8080";

    // Create Stripe Checkout session
    const sessionConfig: any = {
      customer_email: customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
      metadata: {
        event_id: eventId,
        organizer_id: organizer.id,
        user_id: userId || "guest",
        pricing_model: pricingSource,
        subtotal_cents: subtotalCents.toString(),
        promo_discount_cents: promoDiscount.toString(),
        promo_code_id: promoCodeId || "",
        application_fee_cents: totalApplicationFee.toString(),
      },
    };

    // Add transfer data for paid tickets
    if (discountedSubtotal > 0) {
      sessionConfig.payment_intent_data = {
        on_behalf_of: organizer.stripe_account_id,
        transfer_data: {
          destination: organizer.stripe_account_id,
        },
        application_fee_amount: totalApplicationFee,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Stripe session created", { sessionId: session.id });

    // Increment promo code usage if applied
    if (promoCodeId) {
      await supabaseClient
        .from("promo_codes")
        .update({ usage_count: supabaseClient.rpc('', {}) })
        .eq("id", promoCodeId);
      
      // Use raw SQL increment
      await supabaseClient.rpc('', {});
      logStep("Promo code usage will be incremented on payment success");
    }

    // Get or create user for guest checkouts
    let finalUserId = userId;
    if (!userId) {
      const { data: guestUser, error: guestError } = await supabaseClient.auth.admin.createUser({
        email: customerEmail,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { role: "client" }
      });
      
      if (guestError) {
        logStep("Error creating guest user", guestError);
        throw new Error("Could not create user account");
      }
      
      finalUserId = guestUser.user.id;
      logStep("Guest user created", { userId: finalUserId });
    }

    // Generate short code for order
    const shortCode = await supabaseClient.rpc('generate_short_code').then(r => r.data || 'XXXXXXXX');

    // Create order record (pending)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        organizer_id: organizer.id,
        user_id: finalUserId,
        stripe_checkout_session_id: session.id,
        status: "pending",
        amount_total_cents: discountedSubtotal + totalApplicationFee,
        application_fee_cents: totalApplicationFee,
        currency: "EUR",
        short_code: shortCode,
      })
      .select()
      .single();

    if (orderError) {
      logStep("Error creating order", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }
    
    logStep("Order created", { orderId: order.id, shortCode, pricingSource, promoCodeId });

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
