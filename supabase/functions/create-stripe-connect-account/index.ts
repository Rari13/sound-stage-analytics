import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}`, details || "");
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
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    const { organizerId } = await req.json();
    if (!organizerId) throw new Error("organizerId required");

    logStep("Fetching organizer", { organizerId });

    // Get organizer and verify ownership
    const { data: organizer, error: orgError } = await supabaseClient
      .from("organizers")
      .select("id, name, stripe_account_id, owner_user_id")
      .eq("id", organizerId)
      .single();

    if (orgError || !organizer) throw new Error("Organizer not found");
    if (organizer.owner_user_id !== user.id) throw new Error("Not authorized");

    logStep("Organizer verified", { name: organizer.name, hasStripeAccount: !!organizer.stripe_account_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let accountId = organizer.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      logStep("Creating new Stripe Connect account");
      
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
      });

      accountId = account.id;
      logStep("Stripe account created", { accountId });

      // Save stripe_account_id
      const { error: updateError } = await supabaseClient
        .from("organizers")
        .update({ stripe_account_id: accountId })
        .eq("id", organizerId);

      if (updateError) {
        logStep("ERROR saving stripe_account_id", updateError);
        throw updateError;
      }

      logStep("Stripe account ID saved to database");
    } else {
      logStep("Using existing Stripe account", { accountId });
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:8080";
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/orga/home`,
      return_url: `${origin}/orga/home?stripe_onboarding=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(
      JSON.stringify({ 
        url: accountLink.url,
        accountId: accountId
      }),
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
