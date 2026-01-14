import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== IPC/MPDU MODEL FUNCTIONS =====

function calculateIPCBase(
  artistPopularity: number,
  localSwipeLikeRatio: number,
  historicalFillRate: number
): number {
  const externalWeight = 0.3;
  const swipeWeight = 0.3;
  const historyWeight = 0.4;
  
  const normalizedPopularity = artistPopularity / 100;
  return (normalizedPopularity * externalWeight) + 
         (localSwipeLikeRatio * swipeWeight) + 
         (historicalFillRate * historyWeight);
}

function calculateFSat(
  recentPerformances: number,
  cityPopulation: number,
  lambda: number = 0.02
): number {
  const populationFactor = cityPopulation < 200000 ? 1.5 : 1.0;
  const adjustedPerformances = recentPerformances * populationFactor;
  return Math.exp(-lambda * adjustedPerformances);
}

function calculateMLA(
  artistGenres: string[],
  venueTypicalGenres: string[]
): number {
  if (!artistGenres?.length || !venueTypicalGenres?.length) {
    return 0.5;
  }
  
  const genreIntersection = artistGenres.filter(g => 
    venueTypicalGenres.some(vg => vg.toLowerCase() === g.toLowerCase())
  ).length;
  
  return Math.max(0.3, genreIntersection / Math.max(artistGenres.length, venueTypicalGenres.length));
}

function calculateIPC(ipcBase: number, fSat: number, mLa: number): number {
  return Math.min(1, Math.max(0, ipcBase * fSat * mLa));
}

function calculateSellOutProbability(
  expectedDemand: number,
  stdDeviation: number,
  capacity: number
): number {
  if (stdDeviation === 0) return expectedDemand >= capacity ? 1 : 0;
  
  const z = (capacity - expectedDemand) / stdDeviation;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const zAbs = Math.abs(z);
  const t = 1.0 / (1.0 + p * zAbs);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-zAbs * zAbs);
  
  return 0.5 * (1.0 + sign * y);
}

function calculateOptimalPrice(
  ipcScore: number,
  capacity: number,
  cachetCents: number
): { optimal: number; recommended: number } {
  // Price should cover cachet with some margin
  const breakEvenPrice = cachetCents / capacity;
  const demandMultiplier = 0.8 + (ipcScore * 0.6); // 0.8 - 1.4
  
  // Base price estimation (20-50€ range typically)
  const basePrice = Math.max(1500, Math.min(5000, breakEvenPrice * 1.5));
  
  const optimalPrice = basePrice * demandMultiplier;
  const recommendedPrice = basePrice * (demandMultiplier * 0.95); // Slightly conservative
  
  return {
    optimal: Math.round(optimalPrice),
    recommended: Math.round(recommendedPrice)
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      organizerId,
      artistName,
      venueName,
      city,
      cachet,
      capacity,
      targetDate,
    } = body;

    // Input validation
    if (!organizerId || !artistName || !venueName || !city || !cachet || !capacity) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log("Starting event simulation:", { artistName, venueName, city });

    // 1. Find or create artist profile
    let { data: artist } = await supabase
      .from("artist_profiles")
      .select("id, name, genres, external_popularity_score")
      .ilike("name", artistName)
      .maybeSingle();

    if (!artist) {
      const { data: newArtist } = await supabase
        .from("artist_profiles")
        .insert({ name: artistName, genres: ["Unknown"], external_popularity_score: 50 })
        .select()
        .single();
      artist = newArtist;
    }

    // 2. Find or create venue profile
    let { data: venue } = await supabase
      .from("venue_profiles")
      .select("id, venue_name, city, capacity, population, venue_type")
      .ilike("venue_name", venueName)
      .eq("city", city)
      .maybeSingle();

    if (!venue) {
      const { data: newVenue } = await supabase
        .from("venue_profiles")
        .insert({ 
          venue_name: venueName, 
          city, 
          capacity, 
          population: 500000,
          venue_type: "club"
        })
        .select()
        .single();
      venue = newVenue;
    }

    // 3. Get historical data for IPC calculation
    const artistPopularity = artist?.external_popularity_score || 50;
    
    // Get past performances in this city (for saturation)
    const { data: recentPerformances } = await supabase
      .from("artist_performances")
      .select("id")
      .ilike("artist_name", artistName)
      .eq("city", city)
      .gte("event_date", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

    const performanceCount = recentPerformances?.length || 0;
    const cityPopulation = venue?.population || 500000;

    // Get historical fill rate from organizer's past events
    const { data: historicalEvents } = await supabase
      .from("events")
      .select("id, capacity")
      .eq("organizer_id", organizerId)
      .eq("city", city)
      .lt("starts_at", new Date().toISOString())
      .limit(10);

    let historicalFillRate = 0.5;
    if (historicalEvents && historicalEvents.length > 0) {
      const eventIds = historicalEvents.map(e => e.id);
      const { count: ticketsSold } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds);

      const totalCapacity = historicalEvents.reduce((sum, e) => sum + (e.capacity || 100), 0);
      historicalFillRate = totalCapacity > 0 ? Math.min(1, (ticketsSold || 0) / totalCapacity) : 0.5;
    }

    // 4. Calculate IPC components
    const ipcBase = calculateIPCBase(artistPopularity, 0.5, historicalFillRate);
    const fSat = calculateFSat(performanceCount, cityPopulation);
    const mLa = calculateMLA(artist?.genres || [], venue?.venue_type ? [venue.venue_type] : []);
    const ipcScore = calculateIPC(ipcBase, fSat, mLa);

    // 5. Estimate demand
    const { count: potentialUsers } = await supabase
      .from("client_profiles")
      .select("*", { count: "exact", head: true })
      .eq("city", city);

    const marketSize = Math.max(potentialUsers || 1000, 1000);
    const avgPurchaseProb = 0.05 + (ipcScore * 0.15);
    const expectedDemand = marketSize * avgPurchaseProb;
    const stdDeviation = Math.sqrt(expectedDemand * (1 - avgPurchaseProb));

    // Confidence interval
    const confidenceLow = Math.max(0, expectedDemand - 1.96 * stdDeviation);
    const confidenceHigh = expectedDemand + 1.96 * stdDeviation;

    // Sell-out probability
    const sellOutProb = calculateSellOutProbability(expectedDemand, stdDeviation, capacity);

    // 6. Pricing
    const cachetCents = cachet * 100;
    const { optimal, recommended } = calculateOptimalPrice(ipcScore, capacity, cachetCents);

    // 7. Calculate profitability
    const effectiveDemand = Math.min(expectedDemand, capacity);
    const expectedRevenueCents = Math.round(effectiveDemand * recommended);
    const expectedProfitCents = expectedRevenueCents - cachetCents;
    const profitMargin = expectedRevenueCents > 0 ? expectedProfitCents / expectedRevenueCents : 0;
    const breakEvenTickets = Math.ceil(cachetCents / recommended);
    const isViable = expectedProfitCents > 0;

    // 8. Get AI recommendation
    let aiRecommendation = "";
    if (LOVABLE_API_KEY) {
      const aiPrompt = `Tu es un expert en organisation d'événements nightlife. Analyse cette simulation et donne 3 conseils concis:

SIMULATION:
- Artiste: ${artistName}
- Lieu: ${venueName}, ${city}
- Capacité: ${capacity}
- Cachet: ${cachet}€

RÉSULTATS:
- IPC Score: ${(ipcScore * 100).toFixed(0)}%
- Demande attendue: ${Math.round(expectedDemand)} personnes
- Probabilité sold-out: ${(sellOutProb * 100).toFixed(0)}%
- Profit estimé: ${(expectedProfitCents / 100).toFixed(0)}€
- Rentable: ${isViable ? 'Oui' : 'Non'}

Réponds en français avec 3 bullet points maximum.`;

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
              { role: "system", content: "Tu es un expert en stratégie événementielle. Sois concis et actionnable." },
              { role: "user", content: aiPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiRecommendation = aiData.choices[0].message.content;
        }
      } catch (e) {
        console.error("AI recommendation failed:", e);
      }
    }

    // 9. Store simulation
    const { data: simulation, error: insertError } = await supabase
      .from("event_simulations")
      .insert({
        organizer_id: organizerId,
        artist_id: artist?.id,
        artist_name: artistName,
        venue_id: venue?.id,
        venue_name: venueName,
        city,
        cachet_cents: cachetCents,
        capacity,
        target_date: targetDate || null,
        ipc_base: ipcBase,
        f_sat: fSat,
        m_la: mLa,
        ipc_score: ipcScore,
        expected_demand: expectedDemand,
        demand_std_deviation: stdDeviation,
        confidence_interval_low: confidenceLow,
        confidence_interval_high: confidenceHigh,
        sell_out_probability: sellOutProb,
        recommended_price_cents: recommended,
        optimal_price_cents: optimal,
        expected_revenue_cents: expectedRevenueCents,
        expected_profit_cents: expectedProfitCents,
        profit_margin: profitMargin,
        break_even_tickets: breakEvenTickets,
        is_viable: isViable,
        ai_recommendation: aiRecommendation
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("Simulation completed:", { id: simulation.id, isViable });

    return new Response(
      JSON.stringify({ simulation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in simulate-event:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
