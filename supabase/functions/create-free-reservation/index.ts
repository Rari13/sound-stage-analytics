import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[FREE-RESERVATION] ${step}`, details || "");
};

function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateQRToken(): string {
  return crypto.randomUUID();
}

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

    const { eventId, items, customerEmail: providedEmail } = await req.json();
    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("eventId and items array required");
    }

    // Use provided email if user not authenticated
    if (!customerEmail && providedEmail) {
      customerEmail = providedEmail;
    }

    if (!customerEmail) {
      throw new Error("Email required for reservation");
    }

    logStep("Request data", { eventId, items, customerEmail });

    // Fetch event
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, title, slug, organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) throw new Error("Event not found");
    logStep("Event loaded", { eventId: event.id, title: event.title });

    // Fetch requested price tiers and verify they are all free
    const tierIds = items.map((item: any) => item.tierId);
    const { data: tiers, error: tiersError } = await supabaseClient
      .from("price_tiers")
      .select("id, name, price_cents, quota")
      .in("id", tierIds)
      .eq("event_id", eventId);

    if (tiersError || !tiers) throw new Error("Price tiers not found");
    
    // Verify all tiers are free
    const hasNonFreeTier = tiers.some(tier => tier.price_cents > 0);
    if (hasNonFreeTier) {
      throw new Error("This endpoint only handles free reservations");
    }

    logStep("Tiers loaded", { count: tiers.length });

    // Calculate total quantity
    let totalQty = 0;
    for (const item of items) {
      const tier = tiers.find(t => t.id === item.tierId);
      if (!tier) throw new Error(`Tier ${item.tierId} not found`);

      const qty = parseInt(item.qty);
      if (isNaN(qty) || qty < 1) throw new Error(`Invalid quantity for tier ${tier.name}`);

      totalQty += qty;
    }

    logStep("Total quantity calculated", { totalQty });

    // Get or create user
    if (!userId) {
      // For guest users, create or get user account
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.admin.createUser({
        email: customerEmail,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { role: "client" }
      });

      if (signUpError) {
        // If user already exists, try to find them
        if (signUpError.message.includes("already") || signUpError.message.includes("existe")) {
          const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
          if (!listError && users) {
            const existingUser = users.find(u => u.email === customerEmail);
            if (existingUser) {
              userId = existingUser.id;
              logStep("Existing user found", { userId, email: customerEmail });
            }
          }
        }
        
        if (!userId) {
          throw new Error(`Failed to create/find user: ${signUpError.message}`);
        }
      } else if (signUpData.user) {
        userId = signUpData.user.id;
        logStep("Guest account created", { userId, email: customerEmail });
      }
    }

    // Ensure profile exists
    const { data: existingProfile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingProfile) {
      await supabaseClient
        .from("profiles")
        .insert({ id: userId, role: "client" });
      logStep("Profile created", { userId });
    }

    // Create order
    const shortCode = generateShortCode();
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        event_id: eventId,
        user_id: userId!,
        organizer_id: event.organizer_id,
        amount_total_cents: 0,
        application_fee_cents: 0,
        currency: "eur",
        status: "paid",
        short_code: shortCode,
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep("Error creating order", orderError);
      throw new Error("Failed to create order");
    }

    logStep("Order created", { orderId: order.id, shortCode: order.short_code });

    // Create tickets
    const ticketsToCreate = [];
    for (const item of items) {
      const qty = parseInt(item.qty);
      for (let i = 0; i < qty; i++) {
        ticketsToCreate.push({
          event_id: eventId,
          user_id: userId!,
          order_id: order.id,
          qr_token: generateQRToken(),
          status: "valid",
        });
      }
    }

    const { error: ticketsError } = await supabaseClient
      .from("tickets")
      .insert(ticketsToCreate);

    if (ticketsError) {
      logStep("Error creating tickets", ticketsError);
      throw new Error("Failed to create tickets");
    }

    logStep("Tickets created", { count: ticketsToCreate.length });

    // Return success URL
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const successUrl = `${origin}/payment-success?session_id=${order.id}`;

    // Send ticket email asynchronously (non-blocking)
    const emailUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-email`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    fetch(emailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ orderId: order.id }),
    }).then(() => {
      logStep("Ticket email request sent");
    }).catch((err) => {
      logStep("Email error (non-blocking)", err);
    });

    return new Response(
      JSON.stringify({ url: successUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
