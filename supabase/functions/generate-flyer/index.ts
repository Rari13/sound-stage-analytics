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
    const { prompt, organizerId, logoBase64 } = await req.json();
    
    if (!prompt) {
      throw new Error("Le prompt est vide.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Clé API Lovable manquante");
    }

    console.log("Generating flyer with prompt:", prompt);
    console.log("Has logo:", !!logoBase64);

    // Build the enhanced prompt for professional flyer generation
    const systemPrompt = `You are a professional graphic designer creating event flyers. 
Create a visually stunning, modern event flyer with:
- High quality, professional graphic design
- Clear visual hierarchy
- Space at the top for event title (leave it blank, just the design)
- Vibrant colors and modern aesthetics
- No text or typography, just the visual design/background
${logoBase64 ? '- Incorporate the provided logo elegantly into the design, place it prominently but tastefully' : ''}`;

    let messages: any[];
    
    if (logoBase64) {
      // If logo is provided, use multimodal input to incorporate it
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${systemPrompt}\n\nCreate this flyer design: ${prompt}\n\nIMPORTANT: Incorporate the logo image I'm providing into the flyer design. Place it prominently in a corner or center, ensuring it's visible and well-integrated with the overall design.`
            },
            {
              type: "image_url",
              image_url: {
                url: logoBase64
              }
            }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: "user",
          content: `${systemPrompt}\n\nCreate this flyer design: ${prompt}`
        }
      ];
    }

    // Use Lovable AI Gateway with Nano Banana for image generation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages,
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
    console.log("AI response received");

    // Extract base64 image from response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(aiData));
      throw new Error("Aucune image générée par l'IA");
    }

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
    const imageBase64 = base64Match ? base64Match[1] : imageData;

    // Convert Base64 to binary
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Store in Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fileName = `${organizerId}/ai-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('event-banners')
      .upload(fileName, bytes, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('event-banners')
      .getPublicUrl(fileName);

    console.log("Flyer uploaded successfully:", publicUrl);

    return new Response(
      JSON.stringify({ url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Generate flyer error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
