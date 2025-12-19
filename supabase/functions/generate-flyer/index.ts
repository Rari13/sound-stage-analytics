import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Style presets for professional results
const STYLE_PROMPTS: Record<string, string> = {
  techno: "Dark industrial techno aesthetic, neon green lasers, foggy warehouse atmosphere, glitch art style, brutalism architecture, dramatic lighting",
  rap: "Luxury hip-hop aesthetic, gold chains textures, smoke effects, cash money colors, urban graffiti elements, trap night vibe, VIP club atmosphere",
  classy: "Elegant gala dinner background, art deco patterns, gold and black marble, minimalist luxury, bokeh lights, champagne bubbles",
  summer: "Ibiza beach party vibe, sunset gradients, palm tree silhouettes, vibrant orange and purple, tropical house style, ocean waves",
  afro: "African festival colors, geometric kente patterns, vibrant yellows and reds, afrobeats energy, tribal masks silhouettes, sunset savanna",
  electro: "Synthwave retro-futuristic aesthetic, neon pink and blue, grid patterns, 80s sci-fi, chrome reflections, laser beams"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { style, vibe, format, organizerId } = await req.json();

    if (!organizerId) {
      throw new Error("organizerId requis");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Clé API Lovable manquante");
    }

    // 1. VÉRIFICATION DU QUOTA (Freemium)
    const { data: sub } = await supabase
      .from('organizer_subscriptions')
      .select('plan_type')
      .eq('organizer_id', organizerId)
      .eq('status', 'active')
      .single();

    const isPremium = sub?.plan_type === 'premium';

    if (!isPremium) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('generated_flyers')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', organizerId)
        .gte('created_at', oneDayAgo);

      if (count && count >= 1) {
        throw new Error("Limite atteinte (1 flyer/jour). Passez Premium pour l'illimité.");
      }
    }

    // 2. CONSTRUCTION DU PROMPT PRO
    const stylePrompt = STYLE_PROMPTS[style?.toLowerCase()] || STYLE_PROMPTS.techno;
    const aspectRatio = format === 'story' ? '9:16 portrait' : '1:1 square';
    
    const finalPrompt = `Create a stunning professional event flyer background:
${stylePrompt}
${vibe ? `Additional vibe: ${vibe}` : ''}

CRITICAL REQUIREMENTS:
- Ultra high resolution, 8k quality
- Cinematic lighting with dramatic shadows
- ${aspectRatio} aspect ratio
- Leave space at top and bottom for text overlay
- NO TEXT OR TYPOGRAPHY in the image
- Rich colors and atmospheric effects
- Award-winning poster design, trending on Behance`;

    console.log("Generating flyer with prompt:", finalPrompt);

    // 3. GÉNÉRATION AVEC LOVABLE AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: finalPrompt }],
        modalities: ["image", "text"]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Limite de requêtes atteinte, réessayez plus tard.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Crédits insuffisants pour la génération d'image.");
      }
      throw new Error(`Erreur génération: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(aiData));
      throw new Error("Aucune image générée par l'IA");
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
    const imageBase64 = base64Match ? base64Match[1] : imageData;

    // 4. SAUVEGARDE DANS STORAGE
    const fileName = `${organizerId}/${Date.now()}.png`;
    const binString = atob(imageBase64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    
    const { error: uploadError } = await supabase.storage
      .from('flyers')
      .upload(fileName, bytes, { contentType: 'image/png' });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Erreur lors de la sauvegarde de l'image");
    }

    const { data: { publicUrl } } = supabase.storage.from('flyers').getPublicUrl(fileName);

    // 5. ENREGISTREMENT EN BASE
    await supabase.from('generated_flyers').insert({
      organizer_id: organizerId,
      image_url: publicUrl,
      prompt_used: finalPrompt,
      style: style || 'techno'
    });

    console.log("Flyer generated and saved:", publicUrl);

    return new Response(
      JSON.stringify({ 
        url: publicUrl, 
        remaining: isPremium ? '∞' : '0',
        isPremium 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Generate flyer error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
