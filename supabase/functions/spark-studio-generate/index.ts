import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Style presets for professional results
const STYLE_PROMPTS: Record<string, string> = {
  techno: "underground warehouse rave, green lasers cutting through smoke, dark industrial atmosphere, brutalist architecture, energetic crowd silhouette",
  rap: "luxury hip-hop club night, golden lighting, money rain effect, hypebeast fashion aesthetic, smoke machines, sharp focus",
  classy: "elegant gala dinner, bokeh lights, champagne gold and velvet black theme, art deco patterns, sophisticated atmosphere",
  summer: "ibiza sunset beach party, tropical palm trees, warm orange and purple sky, open air festival, summer vibes",
  afro: "African festival colors, geometric kente patterns, vibrant yellows and reds, afrobeats energy, sunset savanna",
  electro: "Synthwave retro-futuristic aesthetic, neon pink and blue, grid patterns, 80s sci-fi, chrome reflections"
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
    
    const finalPrompt = `Generate a high quality professional event poster background for a ${style} party. ${stylePrompt}. ${vibe ? `Additional vibe: ${vibe}` : ''} Photorealistic, 8k, highly detailed, cinematic lighting. No text, no typography. Leave space for text overlay. Aspect ratio: ${aspectRatio}.`;

    console.log("Generating flyer with Lovable AI:", finalPrompt);

    // 3. APPEL LOVABLE AI GATEWAY (Nano Banana)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: finalPrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error("Limite de requêtes atteinte. Réessayez dans quelques instants.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Crédits IA épuisés. Veuillez recharger votre compte.");
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`Erreur AI: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response received");

    // Extract base64 image from response
    const imageBase64Url = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64Url) {
      console.error("No image in response:", JSON.stringify(aiData));
      throw new Error("Aucune image générée");
    }

    // Extract just the base64 part (remove data:image/png;base64, prefix)
    const base64Data = imageBase64Url.replace(/^data:image\/\w+;base64,/, '');
    
    // 4. SAUVEGARDE DANS STORAGE
    const fileName = `${organizerId}/${Date.now()}.png`;
    const binString = atob(base64Data);
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

    console.log("Flyer generated successfully:", publicUrl);

    return new Response(
      JSON.stringify({ 
        url: publicUrl, 
        remaining: isPremium ? '∞' : '0',
        isPremium 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Generate flyer error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
