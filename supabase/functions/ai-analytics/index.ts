import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== IPC/MPDU MODEL FUNCTIONS =====

// Calculate IPC Base: Popularity of artist in city
function calculateIPCBase(
  artistPopularity: number, // 0-100 from external source
  localSwipeLikeRatio: number, // 0-1 from internal swipes
  historicalFillRate: number // 0-1 from past events
): number {
  // Weighted average of external and internal signals
  const externalWeight = 0.3;
  const swipeWeight = 0.3;
  const historyWeight = 0.4;
  
  const normalizedPopularity = artistPopularity / 100;
  return (normalizedPopularity * externalWeight) + 
         (localSwipeLikeRatio * swipeWeight) + 
         (historicalFillRate * historyWeight);
}

// Calculate F_sat: Saturation factor with exponential decay
function calculateFSat(
  recentPerformances: number, // Number of performances in last 180 days
  cityPopulation: number, // Population of the city
  lambda: number = 0.02 // Decay parameter
): number {
  // Small cities (< 200k) have higher saturation sensitivity
  const populationFactor = cityPopulation < 200000 ? 1.5 : 1.0;
  const adjustedPerformances = recentPerformances * populationFactor;
  
  // Exponential decay: F_sat = exp(-λ * n)
  return Math.exp(-lambda * adjustedPerformances);
}

// Calculate M_la: Venue-Artist matching score (simplified cosine similarity)
function calculateMLA(
  artistGenres: string[],
  venueTypicalGenres: string[],
  artistAgeGroup: string | null,
  venueTypicalAgeGroup: string | null
): number {
  if (!artistGenres?.length || !venueTypicalGenres?.length) {
    return 0.5; // Default neutral match
  }
  
  // Genre overlap
  const genreIntersection = artistGenres.filter(g => 
    venueTypicalGenres.some(vg => vg.toLowerCase() === g.toLowerCase())
  ).length;
  const genreScore = genreIntersection / Math.max(artistGenres.length, venueTypicalGenres.length);
  
  // Age group match
  let ageScore = 0.5;
  if (artistAgeGroup && venueTypicalAgeGroup) {
    ageScore = artistAgeGroup === venueTypicalAgeGroup ? 1.0 : 0.3;
  }
  
  return (genreScore * 0.7) + (ageScore * 0.3);
}

// Calculate full IPC score
function calculateIPC(ipcBase: number, fSat: number, mLa: number): number {
  return Math.min(1, Math.max(0, ipcBase * fSat * mLa));
}

// Generate Bass diffusion curve for ticket sales
function generateBassCurve(
  expectedDemand: number,
  daysUntilEvent: number,
  p: number = 0.03, // Innovation coefficient
  q: number = 0.38  // Imitation coefficient
): Array<{ day: number; cumulative: number; daily: number }> {
  const curve: Array<{ day: number; cumulative: number; daily: number }> = [];
  const m = expectedDemand; // Market potential
  
  for (let t = -daysUntilEvent; t <= 0; t++) {
    const tNorm = (daysUntilEvent + t) / daysUntilEvent; // Normalize to 0-1
    
    // Bass model: F(t) = (1 - exp(-(p+q)*t)) / (1 + (q/p)*exp(-(p+q)*t))
    const numerator = 1 - Math.exp(-(p + q) * tNorm);
    const denominator = 1 + (q / p) * Math.exp(-(p + q) * tNorm);
    const cumulative = m * (numerator / denominator);
    
    const prevCumulative = curve.length > 0 ? curve[curve.length - 1].cumulative : 0;
    const daily = cumulative - prevCumulative;
    
    curve.push({ day: t, cumulative, daily: Math.max(0, daily) });
  }
  
  return curve;
}

// Calculate sell-out probability
function calculateSellOutProbability(
  expectedDemand: number,
  stdDeviation: number,
  capacity: number
): number {
  // Using normal distribution approximation
  const z = (capacity - expectedDemand) / stdDeviation;
  // Approximate CDF of standard normal
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const zAbs = Math.abs(z);
  const t = 1.0 / (1.0 + p * zAbs);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-zAbs * zAbs);
  
  return 0.5 * (1.0 + sign * y);
}

// Calculate optimal price using demand elasticity
function calculateOptimalPrice(
  basePrice: number,
  ipcScore: number,
  sellOutProb: number,
  daysUntilEvent: number
): { optimal: number; recommended: number } {
  // Price elasticity based on IPC and time
  const demandMultiplier = 0.8 + (ipcScore * 0.4); // 0.8 - 1.2
  const urgencyMultiplier = daysUntilEvent < 7 ? 1.1 : daysUntilEvent < 30 ? 1.0 : 0.95;
  const scarcityMultiplier = sellOutProb > 0.7 ? 1.15 : sellOutProb > 0.5 ? 1.05 : 1.0;
  
  const optimalPrice = basePrice * demandMultiplier * urgencyMultiplier * scarcityMultiplier;
  const recommendedPrice = basePrice * demandMultiplier * 1.02; // Conservative recommendation
  
  return {
    optimal: Math.round(optimalPrice),
    recommended: Math.round(recommendedPrice)
  };
}

// ===== MAIN HANDLER =====

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, organizerId, eventId, city, question, conversationHistory, genre, targetDate, marketData } = body;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user from JWT
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

    // Verify that the user owns the organizer
    const { data: organizer, error: orgError } = await supabase
      .from("organizers")
      .select("owner_user_id")
      .eq("id", organizerId)
      .single();

    if (orgError || !organizer) {
      return new Response(
        JSON.stringify({ error: "Organizer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (organizer.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - You do not own this organizer" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription status
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

    let systemPrompt = "";
    let userPrompt = "";

    // ===== NEW: DEMAND PREDICTION WITH IPC/MPDU =====
    if (type === "demand-prediction" && eventId) {
      console.log("Starting demand prediction with IPC/MPDU for event:", eventId);

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select(`
          id, title, city, venue, starts_at, capacity, music_genres, event_type,
          price_tiers(price_cents, name)
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ error: "Event not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate days until event
      const daysUntilEvent = Math.max(1, Math.ceil(
        (new Date(event.starts_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ));

      // Get swipes for this event
      const { data: eventSwipes } = await supabase
        .from("swipes")
        .select("direction")
        .eq("event_id", eventId);

      const likes = eventSwipes?.filter(s => s.direction === 'right').length || 0;
      const dislikes = eventSwipes?.filter(s => s.direction === 'left').length || 0;
      const swipeLikeRatio = (likes + dislikes) > 0 ? likes / (likes + dislikes) : 0.5;

      // Get historical events in same city/genre for fill rate
      const { data: historicalEvents } = await supabase
        .from("events")
        .select("id, capacity")
        .eq("organizer_id", organizerId)
        .eq("city", event.city)
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

      // Get artist performances for saturation
      const { data: recentPerformances } = await supabase
        .from("artist_performances")
        .select("id")
        .eq("city", event.city)
        .gte("event_date", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      const performanceCount = recentPerformances?.length || 0;

      // Get venue profile if exists
      const { data: venueProfile } = await supabase
        .from("venue_profiles")
        .select("venue_type, capacity, population")
        .eq("venue_name", event.venue)
        .eq("city", event.city)
        .maybeSingle();

      const cityPopulation = venueProfile?.population || 500000;

      // Calculate IPC components
      const ipcBase = calculateIPCBase(60, swipeLikeRatio, historicalFillRate); // Default 60% external popularity
      const fSat = calculateFSat(performanceCount, cityPopulation);
      const mLa = calculateMLA(
        event.music_genres || [],
        event.music_genres || [], // Use event genres as proxy for venue
        null,
        null
      );
      const ipcScore = calculateIPC(ipcBase, fSat, mLa);

      // Estimate market size (potential users in area)
      const { count: potentialUsers } = await supabase
        .from("client_profiles")
        .select("*", { count: "exact", head: true })
        .eq("city", event.city);

      const marketSize = Math.max(potentialUsers || 500, 500);
      
      // Calculate expected demand using MPDU
      // Simplified: P(buy) ≈ sigmoid(β0 + β1*IPC + β2*priceAffinity + β3*distanceDecay)
      const avgPurchaseProb = 0.05 + (ipcScore * 0.15); // 5-20% base + IPC boost
      const expectedDemand = marketSize * avgPurchaseProb;
      const stdDeviation = Math.sqrt(expectedDemand * (1 - avgPurchaseProb));

      // Confidence interval (95%)
      const confidenceLow = Math.max(0, expectedDemand - 1.96 * stdDeviation);
      const confidenceHigh = expectedDemand + 1.96 * stdDeviation;

      // Sell-out probability
      const capacity = event.capacity || 200;
      const sellOutProb = calculateSellOutProbability(expectedDemand, stdDeviation, capacity);

      // Pricing
      const basePrice = event.price_tiers?.[0]?.price_cents || 2000; // Default 20€
      const { optimal, recommended } = calculateOptimalPrice(basePrice, ipcScore, sellOutProb, daysUntilEvent);

      // Bass diffusion curve
      const bassCurve = generateBassCurve(expectedDemand, daysUntilEvent);

      // Get AI insights
      const aiPrompt = `Tu es un expert en prédiction de demande événementielle. Analyse ces données et donne 3 conseils stratégiques concis:

ÉVÉNEMENT: ${event.title}
- Ville: ${event.city}
- Genres: ${event.music_genres?.join(', ') || 'Non spécifié'}
- Capacité: ${capacity}
- Jours avant: ${daysUntilEvent}

SCORES IPC:
- IPC Base (popularité): ${(ipcBase * 100).toFixed(1)}%
- F_sat (saturation): ${(fSat * 100).toFixed(1)}%
- M_la (matching): ${(mLa * 100).toFixed(1)}%
- IPC Final: ${(ipcScore * 100).toFixed(1)}%

PRÉDICTION:
- Demande attendue: ${Math.round(expectedDemand)} (±${Math.round(stdDeviation)})
- Probabilité sold-out: ${(sellOutProb * 100).toFixed(0)}%
- Prix recommandé: ${(recommended / 100).toFixed(0)}€

Réponds en français avec 3 bullet points maximum.`;

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

      let aiInsights = "";
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiInsights = aiData.choices[0].message.content;
      }

      // Store prediction in database
      await supabase.from("demand_predictions").upsert({
        event_id: eventId,
        organizer_id: organizerId,
        ipc_base: ipcBase,
        f_sat: fSat,
        m_la: mLa,
        ipc_score: ipcScore,
        expected_demand: expectedDemand,
        demand_std_deviation: stdDeviation,
        confidence_interval_low: confidenceLow,
        confidence_interval_high: confidenceHigh,
        sell_out_probability: sellOutProb,
        optimal_price_cents: optimal,
        recommended_price_cents: recommended,
        bass_curve: bassCurve,
        calculated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h cache
      }, { onConflict: 'event_id' });

      console.log("Demand prediction completed:", { eventId, ipcScore, expectedDemand });

      return new Response(
        JSON.stringify({
          prediction: {
            ipc_score: ipcScore,
            ipc_base: ipcBase,
            f_sat: fSat,
            m_la: mLa,
            expected_demand: expectedDemand,
            std_deviation: stdDeviation,
            sell_out_probability: sellOutProb,
            optimal_price_cents: optimal,
            recommended_price_cents: recommended,
            confidence_interval: { low: confidenceLow, high: confidenceHigh },
            bass_curve: bassCurve,
            ai_insights: aiInsights
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== EXISTING HANDLERS =====
    
    if (type === "demand-supply-analysis") {
      console.log("Starting demand-supply analysis for organizer:", organizerId);

      const { data: organizerEvents } = await supabase
        .from("events")
        .select("id, title, city, music_genres, event_type, starts_at, price_tiers(price_cents)")
        .eq("organizer_id", organizerId)
        .order("starts_at", { ascending: false })
        .limit(20);

      const eventIds = organizerEvents?.map(e => e.id) || [];
      
      let swipesData: any[] = [];
      if (eventIds.length > 0) {
        const { data: swipes } = await supabase
          .from("swipes")
          .select("event_id, direction, filters_context, created_at")
          .in("event_id", eventIds);
        swipesData = swipes || [];
      }

      const qualifiedSwipes = swipesData.filter(s => s.filters_context !== null);
      const organicSwipes = swipesData.filter(s => s.filters_context === null);

      const demandPatterns: { cities: Record<string, number>; maxPrices: number[] } = {
        cities: {},
        maxPrices: []
      };

      qualifiedSwipes.forEach(s => {
        if (s.filters_context?.city) {
          demandPatterns.cities[s.filters_context.city] = (demandPatterns.cities[s.filters_context.city] || 0) + 1;
        }
        if (s.filters_context?.maxPrice) {
          demandPatterns.maxPrices.push(s.filters_context.maxPrice);
        }
      });

      const likeCount = swipesData.filter(s => s.direction === 'right').length;
      const dislikeCount = swipesData.filter(s => s.direction === 'left').length;
      const likeRatio = swipesData.length > 0 ? (likeCount / swipesData.length * 100).toFixed(1) : 0;

      const { data: historicalEvents } = await supabase
        .from("historical_events")
        .select("title, city, genre, tickets_sold, revenue_cents, date")
        .eq("organizer_id", organizerId)
        .order("date", { ascending: false })
        .limit(20);

      systemPrompt = `Tu es un expert en analyse de marché événementiel avec une spécialisation en psychologie comportementale. Tu analyses l'écart entre l'offre (les événements créés par l'organisateur) et la demande réelle (basée sur les swipes des utilisateurs).

IMPORTANT: Les "swipes qualifiés" sont les plus précieux car l'utilisateur avait défini des filtres de recherche, ce qui montre une intention forte. Les swipes organiques sont moins informatifs car sans contexte de recherche.`;

      userPrompt = `Analyse l'écart offre/demande pour cet organisateur:

## OFFRE (événements de l'organisateur)
${JSON.stringify(organizerEvents?.map(e => ({
  title: e.title,
  city: e.city,
  genres: e.music_genres,
  type: e.event_type,
  prix_min: e.price_tiers?.length ? Math.min(...e.price_tiers.map((p: any) => p.price_cents)) / 100 : 0
})) || [], null, 2)}

## DEMANDE (swipes des utilisateurs)
- Total swipes: ${swipesData.length}
- Likes: ${likeCount} (${likeRatio}%)
- Dislikes: ${dislikeCount}
- Swipes qualifiés (avec filtres): ${qualifiedSwipes.length}
- Swipes organiques: ${organicSwipes.length}

### Patterns de recherche qualifiée:
- Villes recherchées: ${JSON.stringify(demandPatterns.cities)}
- Budgets max recherchés: ${demandPatterns.maxPrices.length > 0 ? `Moyenne: ${(demandPatterns.maxPrices.reduce((a, b) => a + b, 0) / demandPatterns.maxPrices.length).toFixed(0)}€, Min: ${Math.min(...demandPatterns.maxPrices)}€, Max: ${Math.max(...demandPatterns.maxPrices)}€` : 'Non renseigné'}

## HISTORIQUE (événements passés)
${JSON.stringify(historicalEvents?.slice(0, 10) || [], null, 2)}

Fournis une analyse structurée:
1. **Taux d'engagement** - Interprète le ratio likes/dislikes
2. **Écart géographique** - Les villes où tu proposes vs celles recherchées
3. **Sensibilité au prix** - Tes tarifs vs les budgets des utilisateurs
4. **Recommandations stratégiques** - 3 actions concrètes pour mieux aligner offre/demande
5. **Opportunités manquées** - Types d'événements que tu devrais envisager`;

    } else if (type === "market-simulation" && city) {
      console.log("Starting market simulation:", { city, genre, targetDate });

      // Also calculate IPC for market simulation
      const { data: recentPerformances } = await supabase
        .from("artist_performances")
        .select("id, artist_name, tickets_sold, capacity")
        .eq("city", city)
        .gte("event_date", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      const performanceCount = recentPerformances?.length || 0;
      const avgFillRate = recentPerformances?.length ? 
        recentPerformances.reduce((sum, p) => sum + ((p.tickets_sold || 0) / (p.capacity || 100)), 0) / recentPerformances.length : 0.5;

      // Calculate saturation score using F_sat formula
      const fSat = calculateFSat(performanceCount, 500000); // Default city population

      systemPrompt = `Tu es un expert en stratégie événementielle (Nightlife Analyst). Tu analyses les données du marché pour conseiller les organisateurs sur le potentiel d'un événement.

IMPORTANT: Tu dois toujours répondre de manière concise et actionnable. Les données que tu reçois sont anonymisées (agrégées sur plusieurs organisateurs) pour respecter la confidentialité.

MODÈLE IPC UTILISÉ:
- F_sat (facteur de saturation) actuel pour ${city}: ${(fSat * 100).toFixed(0)}% (${performanceCount} perfs récentes)
- Taux de remplissage moyen historique: ${(avgFillRate * 100).toFixed(0)}%`;

      userPrompt = `Analyse le marché pour:
- Ville: ${city}
- Genre: ${genre || 'Non spécifié'}
- Date prévue: ${targetDate || 'Non spécifiée'}

Données de marché agrégées (anonymes):
${JSON.stringify(marketData || [], null, 2)}

Indicateurs IPC:
- Saturation du marché (F_sat): ${(fSat * 100).toFixed(0)}%
- Performances récentes (180j): ${performanceCount}
- Remplissage moyen: ${(avgFillRate * 100).toFixed(0)}%

${(!marketData || marketData.length === 0) ? 
  `ATTENTION: Pas de données disponibles pour cette combinaison ville/genre. Cela peut signifier:
  - Moins de 3 organisateurs ont créé des événements (règle d'anonymat)
  - Cette combinaison n'a pas d'historique

Donne quand même des conseils généraux basés sur les indicateurs IPC et tes connaissances.` :
  `Analyse ces tendances et fournis:
1. Une évaluation du risque basée sur F_sat (saturé si < 50%, opportunité si > 80%)
2. Des conseils sur le pricing basés sur les moyennes
3. Le meilleur timing pour cette date
4. 1 conseil tactique concret basé sur l'IPC`
}

Réponds de manière concise et actionnable.`;

    } else if (type === "market-analysis" && city) {
      const { data: clientProfiles } = await supabase
        .from("client_profiles")
        .select("preferred_genres, art_movements, artists, city, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      const { data: cityEvents } = await supabase
        .from("events")
        .select("city, music_genres, event_type, latitude, longitude")
        .eq("city", city)
        .eq("status", "published");

      const { data: citySwipes } = await supabase
        .from("swipes")
        .select("direction, filters_context")
        .not("filters_context", "is", null);

      const cityDemand = citySwipes?.filter(s => 
        s.filters_context?.city?.toLowerCase().includes(city.toLowerCase())
      ) || [];

      systemPrompt = `Tu es un expert en analyse de marché événementiel. Analyse les données démographiques, les préférences des utilisateurs et la demande réelle (swipes) pour recommander les types d'événements qui auraient du succès dans une ville donnée.`;
      
      userPrompt = `Analyse le marché pour la ville de ${city}.
      
Données clients dans un rayon de 50km: ${JSON.stringify(clientProfiles?.slice(0, 50) || [])}
Événements passés dans cette ville: ${JSON.stringify(cityEvents || [])}
Demande qualifiée (swipes avec filtre ville ${city}): ${cityDemand.length} recherches

Fournis:
1. Les genres musicaux/mouvements artistiques les plus demandés
2. Le potentiel de marché pour différents types d'événements
3. Les créneaux horaires et périodes recommandés
4. Une estimation du nombre de participants potentiels
5. Des recommandations de tarification`;

    } else if (type === "event-insights" && eventId) {
      const { data: event } = await supabase
        .from("events")
        .select("*, organizers(*)")
        .eq("id", eventId)
        .single();

      const { data: tickets } = await supabase
        .from("tickets")
        .select("issued_at, status")
        .eq("event_id", eventId);

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, amount_total_cents, status")
        .eq("event_id", eventId);

      const { data: eventSwipes } = await supabase
        .from("swipes")
        .select("direction, filters_context, created_at")
        .eq("event_id", eventId);

      const likes = eventSwipes?.filter(s => s.direction === 'right').length || 0;
      const dislikes = eventSwipes?.filter(s => s.direction === 'left').length || 0;

      systemPrompt = `Tu es un expert en analyse d'événements. Analyse les performances de vente et les interactions utilisateurs pour fournir des insights actionnables.`;
      
      userPrompt = `Analyse cet événement: ${event?.title}
      
Données de vente:
- Billets: ${JSON.stringify(tickets || [])}
- Commandes: ${JSON.stringify(orders || [])}
- Date de début: ${event?.starts_at}
- Capacité: ${event?.capacity}

Données d'engagement (swipes):
- Likes: ${likes}
- Dislikes: ${dislikes}
- Ratio d'intérêt: ${likes + dislikes > 0 ? ((likes / (likes + dislikes)) * 100).toFixed(1) : 0}%

Fournis:
1. Taux de conversion et vitesse de vente
2. Analyse de l'engagement vs conversions
3. Prédiction du nombre final de billets vendus
4. Recommandations pour améliorer les ventes
5. Meilleur moment pour lancer des promotions`;

    } else if (type === "revenue-prediction" && eventId) {
      const { data: event } = await supabase
        .from("events")
        .select("*, price_tiers(*)")
        .eq("id", eventId)
        .single();

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, amount_total_cents")
        .eq("event_id", eventId)
        .eq("status", "completed");

      const { count: ticketsSold } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      systemPrompt = `Tu es un expert en prévision financière pour les événements. Analyse les données de vente actuelles et prédis les revenus finaux.`;
      
      userPrompt = `Prédis les revenus pour: ${event?.title}
      
Données actuelles:
- Billets vendus: ${ticketsSold}
- Capacité totale: ${event?.capacity}
- Tarifs: ${JSON.stringify(event?.price_tiers || [])}
- Commandes actuelles: ${JSON.stringify(orders || [])}
- Jours restants: ${Math.ceil((new Date(event?.starts_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}

Fournis:
1. Prédiction du nombre total de billets qui seront vendus
2. Estimation des revenus totaux (pessimiste, réaliste, optimiste)
3. Recommandations de prix pour maximiser les revenus
4. Analyse de la courbe de vente actuelle`;

    } else if (type === "general-insights") {
      const { data: events } = await supabase
        .from("events")
        .select(`
          id, title, starts_at, capacity, status,
          tickets:tickets(count),
          orders:orders(amount_total_cents, status)
        `)
        .eq("organizer_id", organizerId)
        .order("starts_at", { ascending: false })
        .limit(10);

      const eventIds = events?.map(e => e.id) || [];
      let totalLikes = 0;
      let totalDislikes = 0;
      
      if (eventIds.length > 0) {
        const { data: allSwipes } = await supabase
          .from("swipes")
          .select("direction")
          .in("event_id", eventIds);
        
        totalLikes = allSwipes?.filter(s => s.direction === 'right').length || 0;
        totalDislikes = allSwipes?.filter(s => s.direction === 'left').length || 0;
      }

      systemPrompt = `Tu es un consultant expert en gestion d'événements. Analyse les performances globales de l'organisateur et fournis des recommandations stratégiques.`;
      
      userPrompt = `Analyse les performances de l'organisateur:
      
Événements récents: ${JSON.stringify(events || [])}
Engagement global: ${totalLikes} likes, ${totalDislikes} dislikes (ratio: ${totalLikes + totalDislikes > 0 ? ((totalLikes / (totalLikes + totalDislikes)) * 100).toFixed(1) : 0}%)

Fournis:
1. Tendances de performance (événements qui marchent le mieux)
2. Analyse de l'engagement vs ventes
3. Recommandations pour améliorer les ventes futures
4. Insights sur la saisonnalité
5. Suggestions de nouveaux types d'événements à créer`;

    } else if (type === "custom-question" && question) {
      console.log("Processing custom question:", question);

      const { data: events } = await supabase
        .from("events")
        .select(`
          id, title, starts_at, ends_at, capacity, status, city, music_genres, event_type,
          price_tiers(price_cents, name)
        `)
        .eq("organizer_id", organizerId)
        .order("starts_at", { ascending: false })
        .limit(15);

      const eventIds = events?.map(e => e.id) || [];
      
      let swipesData: any[] = [];
      if (eventIds.length > 0) {
        const { data: swipes } = await supabase
          .from("swipes")
          .select("event_id, direction, filters_context, created_at")
          .in("event_id", eventIds);
        swipesData = swipes || [];
      }

      let ticketsCount = 0;
      let ordersData: any[] = [];
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds);
        ticketsCount = count || 0;

        const { data: orders } = await supabase
          .from("orders")
          .select("event_id, amount_total_cents, status, created_at")
          .in("event_id", eventIds)
          .eq("status", "completed");
        ordersData = orders || [];
      }

      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId);

      const { data: historicalEvents } = await supabase
        .from("historical_events")
        .select("title, city, genre, tickets_sold, revenue_cents, date")
        .eq("organizer_id", organizerId)
        .order("date", { ascending: false })
        .limit(10);

      // Get demand predictions for context
      const { data: predictions } = await supabase
        .from("demand_predictions")
        .select("event_id, ipc_score, expected_demand, sell_out_probability")
        .eq("organizer_id", organizerId)
        .order("calculated_at", { ascending: false })
        .limit(5);

      const likes = swipesData.filter(s => s.direction === 'right').length;
      const dislikes = swipesData.filter(s => s.direction === 'left').length;
      const totalRevenue = ordersData.reduce((sum, o) => sum + (o.amount_total_cents || 0), 0) / 100;

      systemPrompt = `Tu es un assistant IA expert en organisation d'événements et en analyse comportementale. Tu aides les organisateurs à comprendre leur audience, optimiser leurs ventes et développer leur activité.

Tu as accès aux données complètes de l'organisateur et tu dois répondre de manière précise, personnalisée et actionnable. Sois concis mais complet. Utilise des émojis avec parcimonie pour structurer ta réponse.

CONTEXTE ORGANISATEUR:
- Abonnés: ${followersCount || 0}
- Billets vendus (total): ${ticketsCount}
- Revenus (total): ${totalRevenue.toFixed(2)}€
- Engagement: ${likes} likes, ${dislikes} dislikes (${likes + dislikes > 0 ? ((likes / (likes + dislikes)) * 100).toFixed(1) : 0}% positif)

PRÉDICTIONS IPC/MPDU:
${predictions?.map(p => `- Event ${p.event_id.slice(0, 8)}: IPC ${(p.ipc_score * 100).toFixed(0)}%, Demande ${Math.round(p.expected_demand)}, Sold-out ${(p.sell_out_probability * 100).toFixed(0)}%`).join('\n') || 'Aucune prédiction disponible'}

ÉVÉNEMENTS RÉCENTS:
${JSON.stringify(events?.map(e => ({
  titre: e.title,
  ville: e.city,
  date: e.starts_at,
  statut: e.status,
  genres: e.music_genres,
  type: e.event_type,
  tarifs: e.price_tiers?.map((p: any) => `${p.name}: ${p.price_cents/100}€`)
})) || [], null, 2)}

HISTORIQUE (importé):
${JSON.stringify(historicalEvents || [], null, 2)}

DONNÉES DE SWIPES:
- Total: ${swipesData.length}
- Avec filtres de recherche: ${swipesData.filter(s => s.filters_context).length}`;

      const conversationMessages = conversationHistory?.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })) || [];

      userPrompt = question;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
        { role: "user", content: userPrompt }
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques instants." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Crédits insuffisants. Veuillez recharger votre compte." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;

      console.log("Custom question answered:", { organizerId, question });

      return new Response(
        JSON.stringify({ analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI for non-custom questions
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log("AI Analysis completed:", { type, organizerId, eventId, city });

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-analytics:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
