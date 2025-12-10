import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[CHECK-SUBSCRIPTION] Starting subscription check");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    console.log("[CHECK-SUBSCRIPTION] User authenticated:", user.email);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      console.log("[CHECK-SUBSCRIPTION] No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        isPremium: false,
        trialActive: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    console.log("[CHECK-SUBSCRIPTION] Found customer:", customerId);

    // Check for active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeOrTrialing = subscriptions.data.find(
      (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
    );

    if (!activeOrTrialing) {
      console.log("[CHECK-SUBSCRIPTION] No active subscription");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        isPremium: false,
        trialActive: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const isTrialing = activeOrTrialing.status === "trialing";
    const subscriptionEnd = new Date(activeOrTrialing.current_period_end * 1000).toISOString();
    const trialEnd = activeOrTrialing.trial_end 
      ? new Date(activeOrTrialing.trial_end * 1000).toISOString() 
      : null;

    console.log("[CHECK-SUBSCRIPTION] Active subscription found, trialing:", isTrialing);

    return new Response(JSON.stringify({
      subscribed: true,
      isPremium: true,
      trialActive: isTrialing,
      trialEnd,
      subscriptionEnd,
      status: activeOrTrialing.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CHECK-SUBSCRIPTION] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
