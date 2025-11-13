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
    const { type, organizerId, eventId, city } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    if (type === "market-analysis" && city) {
      // Analyze market potential for a city
      const { data: clientProfiles } = await supabase
        .from("client_profiles")
        .select("preferred_genres, art_movements, artists, city, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      // Calculate distance and filter clients within 50km of the city
      const { data: cityEvents } = await supabase
        .from("events")
        .select("city, music_genres, event_type, latitude, longitude")
        .eq("city", city)
        .eq("status", "published");

      systemPrompt = `Tu es un expert en analyse de marché événementiel. Analyse les données démographiques et les préférences des utilisateurs pour recommander les types d'événements qui auraient du succès dans une ville donnée.`;
      
      userPrompt = `Analyse le marché pour la ville de ${city}.
      
Données clients dans un rayon de 50km: ${JSON.stringify(clientProfiles?.slice(0, 50) || [])}
Événements passés dans cette ville: ${JSON.stringify(cityEvents || [])}

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

      systemPrompt = `Tu es un expert en analyse d'événements. Analyse les performances de vente et fournis des insights actionnables.`;
      
      userPrompt = `Analyse cet événement: ${event?.title}
      
Données de vente:
- Billets: ${JSON.stringify(tickets || [])}
- Commandes: ${JSON.stringify(orders || [])}
- Date de début: ${event?.starts_at}
- Capacité: ${event?.capacity}

Fournis:
1. Taux de conversion et vitesse de vente
2. Prédiction du nombre final de billets vendus
3. Recommandations pour améliorer les ventes
4. Meilleur moment pour lancer des promotions
5. Analyse du comportement d'achat`;

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

      systemPrompt = `Tu es un consultant expert en gestion d'événements. Analyse les performances globales de l'organisateur et fournis des recommandations stratégiques.`;
      
      userPrompt = `Analyse les performances de l'organisateur:
      
Événements récents: ${JSON.stringify(events || [])}

Fournis:
1. Tendances de performance (événements qui marchent le mieux)
2. Recommandations pour améliorer les ventes futures
3. Insights sur la saisonnalité
4. Suggestions de nouveaux types d'événements à créer
5. Benchmark par rapport aux standards du marché`;
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