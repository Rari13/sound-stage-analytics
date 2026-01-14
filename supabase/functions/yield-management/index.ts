import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bass diffusion model for expected sales velocity
function calculateExpectedVelocity(
  expectedDemand: number,
  daysUntilEvent: number,
  daysSinceSaleStart: number,
  p: number = 0.03, // Innovation coefficient
  q: number = 0.38  // Imitation coefficient
): number {
  const totalDays = daysSinceSaleStart + daysUntilEvent;
  if (totalDays <= 0) return 0;
  
  const tNorm = daysSinceSaleStart / totalDays;
  const m = expectedDemand;
  
  // Bass model derivative: f(t) = (p + q*F(t)) * (1 - F(t))
  const numerator = 1 - Math.exp(-(p + q) * tNorm);
  const denominator = 1 + (q / p) * Math.exp(-(p + q) * tNorm);
  const F_t = numerator / denominator;
  
  const dailyRate = m * (p + q * F_t) * (1 - F_t);
  return dailyRate / 24; // Convert to hourly
}

// Calculate price recommendation based on velocity ratio
function calculateRecommendation(
  velocityRatio: number,
  currentPrice: number,
  fillRate: number,
  daysUntilEvent: number
): {
  action: string;
  newPrice: number;
  priceChange: number;
  confidence: number;
  risk: string;
} {
  let action = 'hold';
  let priceMultiplier = 1.0;
  let confidence = 0.7;
  let risk = 'on_track';

  // High velocity (selling faster than expected)
  if (velocityRatio > 1.3) {
    action = 'increase_price';
    priceMultiplier = 1 + Math.min(0.20, (velocityRatio - 1) * 0.15); // Max +20%
    confidence = Math.min(0.95, 0.6 + velocityRatio * 0.15);
    risk = fillRate > 0.8 ? 'oversell_risk' : 'on_track';
  }
  // Low velocity (selling slower than expected)
  else if (velocityRatio < 0.7) {
    if (daysUntilEvent > 14) {
      action = 'hold'; // Wait and see
      confidence = 0.5;
    } else if (daysUntilEvent > 3) {
      action = 'decrease_price';
      priceMultiplier = 1 - Math.min(0.15, (1 - velocityRatio) * 0.20); // Max -15%
      confidence = Math.min(0.85, 0.5 + (1 - velocityRatio) * 0.3);
    } else {
      action = 'urgency_campaign';
      priceMultiplier = 1; // Keep price, add urgency
      confidence = 0.75;
    }
    risk = 'undersell';
  }
  // Moderate velocity
  else if (velocityRatio >= 0.7 && velocityRatio <= 1.3) {
    if (velocityRatio > 1.1 && fillRate > 0.6) {
      action = 'increase_price';
      priceMultiplier = 1.05; // Small +5%
      confidence = 0.6;
    } else if (velocityRatio < 0.9 && fillRate < 0.5 && daysUntilEvent < 7) {
      action = 'promo';
      priceMultiplier = 0.9; // -10% promo
      confidence = 0.65;
    }
  }

  const newPrice = Math.round(currentPrice * priceMultiplier);
  const priceChange = ((newPrice / currentPrice) - 1) * 100;

  return { action, newPrice, priceChange, confidence, risk };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, organizerId, eventId, recommendationId } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify organizer ownership
    const { data: organizer, error: orgError } = await supabase
      .from("organizers")
      .select("owner_user_id")
      .eq("id", organizerId)
      .single();

    if (orgError || !organizer || organizer.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription
    const { data: subscription } = await supabase
      .from("organizer_subscriptions")
      .select("plan_type, status")
      .eq("organizer_id", organizerId)
      .eq("status", "active")
      .single();

    if (!subscription || subscription.plan_type !== "premium") {
      return new Response(
        JSON.stringify({ error: "Premium subscription required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ANALYZE =====
    if (type === "analyze" && eventId) {
      console.log("Starting yield analysis for event:", eventId);

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select(`
          id, title, city, venue, starts_at, capacity,
          price_tiers(id, price_cents, name)
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ error: "Event not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const daysUntilEvent = Math.max(1, Math.ceil(
        (new Date(event.starts_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ));

      // Get current sales
      const { count: ticketsSold } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      const currentTicketsSold = ticketsSold || 0;
      const capacity = event.capacity || 200;
      const fillRate = currentTicketsSold / capacity;

      // Get current revenue
      const { data: orders } = await supabase
        .from("orders")
        .select("amount_total_cents")
        .eq("event_id", eventId)
        .eq("status", "completed");

      const totalRevenue = orders?.reduce((sum, o) => sum + o.amount_total_cents, 0) || 0;

      // Get current price (first active tier)
      const currentPrice = event.price_tiers?.[0]?.price_cents || 2000;

      // Get sales snapshots for the curve
      const { data: snapshots } = await supabase
        .from("sales_snapshots")
        .select("*")
        .eq("event_id", eventId)
        .order("snapshot_at", { ascending: true })
        .limit(100);

      // Calculate sales velocity (tickets sold in last 24h)
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const { count: recentSales } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .gte("issued_at", yesterday.toISOString());

      const actualVelocity = (recentSales || 0) / 24;

      // Get demand prediction
      const { data: prediction } = await supabase
        .from("demand_predictions")
        .select("expected_demand, bass_curve")
        .eq("event_id", eventId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const expectedDemand = prediction?.expected_demand || capacity * 0.7;

      // Calculate expected velocity based on Bass model
      const eventCreatedAt = snapshots?.[0]?.snapshot_at || event.starts_at;
      const daysSinceSaleStart = Math.max(1, Math.ceil(
        (Date.now() - new Date(eventCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
      ));
      const expectedVelocity = calculateExpectedVelocity(expectedDemand, daysUntilEvent, daysSinceSaleStart);
      const velocityRatio = expectedVelocity > 0 ? actualVelocity / expectedVelocity : 1;

      // Calculate recommendation
      const recommendation = calculateRecommendation(velocityRatio, currentPrice, fillRate, daysUntilEvent);

      // Calculate revenue at risk
      const expectedRevenue = expectedDemand * currentPrice;
      const projectedRevenue = currentTicketsSold * currentPrice + 
        (expectedDemand - currentTicketsSold) * recommendation.newPrice;
      const revenueAtRisk = recommendation.risk === 'undersell' 
        ? Math.max(0, expectedRevenue - projectedRevenue) 
        : 0;

      // Generate AI reasoning
      let reasoning = "";
      if (LOVABLE_API_KEY) {
        const aiPrompt = `Tu es un expert en yield management pour les événements. Analyse ces données et explique ta recommandation en 2 phrases max:

ÉVÉNEMENT: ${event.title}
- Jours restants: ${daysUntilEvent}
- Billets vendus: ${currentTicketsSold}/${capacity} (${(fillRate * 100).toFixed(0)}%)
- Vélocité actuelle: ${actualVelocity.toFixed(2)}/h vs attendue: ${expectedVelocity.toFixed(2)}/h
- Ratio vélocité: ${(velocityRatio * 100).toFixed(0)}%

RECOMMANDATION: ${recommendation.action}
- Changement prix: ${recommendation.priceChange.toFixed(0)}%
- Risque: ${recommendation.risk}

Explique pourquoi cette action est recommandée.`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Tu es un expert en pricing dynamique. Sois concis et précis." },
                { role: "user", content: aiPrompt }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            reasoning = aiData.choices[0].message.content;
          }
        } catch (e) {
          console.error("AI reasoning failed:", e);
          reasoning = `Basé sur un ratio de vélocité de ${(velocityRatio * 100).toFixed(0)}% et un taux de remplissage de ${(fillRate * 100).toFixed(0)}%.`;
        }
      }

      // Store recommendation
      const { data: storedRec } = await supabase
        .from("yield_recommendations")
        .insert({
          event_id: eventId,
          organizer_id: organizerId,
          current_tickets_sold: currentTicketsSold,
          current_fill_rate: fillRate,
          current_price_cents: currentPrice,
          days_until_event: daysUntilEvent,
          predicted_demand: expectedDemand,
          actual_velocity: actualVelocity,
          expected_velocity: expectedVelocity,
          velocity_ratio: velocityRatio,
          recommended_action: recommendation.action,
          recommended_price_cents: recommendation.newPrice,
          price_change_percent: recommendation.priceChange,
          confidence_score: recommendation.confidence,
          sell_out_risk: recommendation.risk,
          revenue_at_risk_cents: revenueAtRisk,
          reasoning: reasoning,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      // Create sales snapshot
      await supabase.from("sales_snapshots").insert({
        event_id: eventId,
        tickets_sold: currentTicketsSold,
        revenue_cents: totalRevenue,
        current_price_cents: currentPrice,
        days_until_event: daysUntilEvent,
        fill_rate: fillRate,
        velocity_per_hour: actualVelocity
      });

      console.log("Yield analysis completed:", { eventId, action: recommendation.action });

      return new Response(
        JSON.stringify({
          analysis: {
            currentState: {
              ticketsSold: currentTicketsSold,
              capacity,
              fillRate,
              currentPrice,
              daysUntilEvent,
              revenue: totalRevenue
            },
            prediction: {
              expectedDemand,
              expectedVelocity,
              actualVelocity,
              velocityRatio
            },
            recommendation: {
              action: recommendation.action,
              newPrice: recommendation.newPrice,
              priceChange: recommendation.priceChange,
              confidence: recommendation.confidence,
              risk: recommendation.risk,
              revenueAtRisk,
              reasoning
            },
            salesCurve: snapshots || []
          },
          recommendation: storedRec
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== APPLY RECOMMENDATION =====
    if (type === "apply" && recommendationId) {
      const { data: rec, error: recError } = await supabase
        .from("yield_recommendations")
        .select("*")
        .eq("id", recommendationId)
        .single();

      if (recError || !rec) {
        return new Response(
          JSON.stringify({ error: "Recommendation not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current price tier
      const { data: priceTier } = await supabase
        .from("price_tiers")
        .select("id, price_cents")
        .eq("event_id", rec.event_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .single();

      if (priceTier) {
        // Log price change
        await supabase.from("price_change_events").insert({
          event_id: rec.event_id,
          price_tier_id: priceTier.id,
          price_before_cents: priceTier.price_cents,
          price_after_cents: rec.recommended_price_cents,
          reason: 'yield_auto'
        });

        // Update price
        await supabase
          .from("price_tiers")
          .update({ price_cents: rec.recommended_price_cents })
          .eq("id", priceTier.id);
      }

      // Mark recommendation as applied
      await supabase
        .from("yield_recommendations")
        .update({ status: 'applied', applied_at: new Date().toISOString() })
        .eq("id", recommendationId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in yield-management:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
