import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, organizerId, eventId, city, question, conversationHistory } = await req.json();
    
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

    // Get data based on type
    if (type === "demand-supply-analysis") {
      // NEW: Analyze swipes demand vs organizer supply
      console.log("Starting demand-supply analysis for organizer:", organizerId);

      // Get organizer's events
      const { data: organizerEvents } = await supabase
        .from("events")
        .select("id, title, city, music_genres, event_type, starts_at, price_tiers(price_cents)")
        .eq("organizer_id", organizerId)
        .order("starts_at", { ascending: false })
        .limit(20);

      // Get all swipes for organizer's events
      const eventIds = organizerEvents?.map(e => e.id) || [];
      
      let swipesData: any[] = [];
      if (eventIds.length > 0) {
        const { data: swipes } = await supabase
          .from("swipes")
          .select("event_id, direction, filters_context, created_at")
          .in("event_id", eventIds);
        swipesData = swipes || [];
      }

      // Separate qualified swipes (with filters) from organic swipes
      const qualifiedSwipes = swipesData.filter(s => s.filters_context !== null);
      const organicSwipes = swipesData.filter(s => s.filters_context === null);

      // Aggregate filter contexts to understand demand
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

      // Calculate like/dislike ratios
      const likeCount = swipesData.filter(s => s.direction === 'right').length;
      const dislikeCount = swipesData.filter(s => s.direction === 'left').length;
      const likeRatio = swipesData.length > 0 ? (likeCount / swipesData.length * 100).toFixed(1) : 0;

      // Get historical events for more context
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

    } else if (type === "market-analysis" && city) {
      // Analyze market potential for a city
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

      // Get swipes in this city for demand analysis
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
      // Get event-specific insights
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

      // Get swipes for this event
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
      // Predict revenue
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
      // General organizer insights
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

      // Get swipe stats for all organizer events
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
      // Custom question from the organizer
      console.log("Processing custom question:", question);

      // Fetch comprehensive data for context
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
      
      // Get swipes data
      let swipesData: any[] = [];
      if (eventIds.length > 0) {
        const { data: swipes } = await supabase
          .from("swipes")
          .select("event_id, direction, filters_context, created_at")
          .in("event_id", eventIds);
        swipesData = swipes || [];
      }

      // Get tickets and orders
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

      // Get followers
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId);

      // Get historical events
      const { data: historicalEvents } = await supabase
        .from("historical_events")
        .select("title, city, genre, tickets_sold, revenue_cents, date")
        .eq("organizer_id", organizerId)
        .order("date", { ascending: false })
        .limit(10);

      // Calculate stats
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

      // Build conversation context
      const conversationMessages = conversationHistory?.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })) || [];

      userPrompt = question;

      // Include conversation history in the AI call
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
        { role: "user", content: userPrompt }
      ];

      // Special handling for custom questions with conversation history
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

    // Call Lovable AI
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
