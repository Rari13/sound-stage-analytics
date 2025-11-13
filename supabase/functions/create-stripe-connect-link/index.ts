import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CONNECT-LINK] ${step}`, details || "");
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

    // Get organizer and verify ownership
    const { data: organizer, error: orgError } = await supabaseClient
      .from("organizers")
      .select("id, name, stripe_account_id, owner_user_id")
      .eq("id", organizerId)
      .single();

    if (orgError || !organizer) throw new Error("Organizer not found");
    if (organizer.owner_user_id !== user.id) throw new Error("Not authorized");
    if (!organizer.stripe_account_id) throw new Error("No Stripe account found");

    logStep("Organizer verified", { accountId: organizer.stripe_account_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:8080";

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: organizer.stripe_account_id,
      refresh_url: `${origin}/organizer`,
      return_url: `${origin}/organizer?stripe_onboarding=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
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
