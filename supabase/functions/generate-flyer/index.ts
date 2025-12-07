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
    const { action, prompt, messages, exchangeCount, maxExchanges, organizerId, logoBase64 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Clé API Lovable manquante");
    }

    // ACTION: REFINE - AI converses to understand the user's vision
    if (action === "refine") {
      console.log("Refining user vision, exchange:", exchangeCount);
      
      const systemPrompt = `Tu es un directeur artistique expert en création d'affiches d'événements (concerts, festivals, soirées).
      
TON OBJECTIF : Comprendre PARFAITEMENT ce que l'utilisateur veut pour son affiche en ${maxExchanges} échanges maximum.

RÈGLES :
- Pose des questions précises et pertinentes pour cerner : le type d'événement, l'ambiance, les couleurs, le style visuel
- Sois concis et conversationnel (max 2-3 phrases)
- Quand tu as assez d'infos (type + ambiance + style minimum), réponds avec "READY:" suivi du prompt final en anglais
- Si c'est l'échange ${maxExchanges}, tu DOIS être prêt et répondre avec "READY:"

EXEMPLES DE BONNES QUESTIONS :
- "C'est quel genre de soirée ? Plutôt club, festival en plein air, concert intime ?"
- "Tu veux une ambiance plutôt dark/underground ou festive/colorée ?"
- "Des couleurs qui te parlent ? Néon, or et noir, pastel ?"

FORMAT DE RÉPONSE QUAND PRÊT :
READY: Professional event flyer for [type], [style] aesthetic, [colors], [specific elements], cinematic lighting, 8k quality, no text`;

      const aiMessages = [
        { role: "system", content: systemPrompt },
        ...messages
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI error:", response.status, errorText);
        throw new Error("Erreur de communication avec l'IA");
      }

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "";
      
      console.log("AI response:", aiMessage);

      // Check if AI is ready to generate
      if (aiMessage.includes("READY:")) {
        const finalPrompt = aiMessage.split("READY:")[1]?.trim() || "";
        return new Response(
          JSON.stringify({ 
            ready: true, 
            message: "Parfait ! J'ai compris ta vision. Je génère ton affiche... 🎨",
            finalPrompt 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          ready: false, 
          message: aiMessage 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: GENERATE - Create the actual image
    if (action === "generate" || !action) {
      if (!prompt) {
        throw new Error("Le prompt est vide.");
      }

      console.log("Generating flyer with prompt:", prompt);
      console.log("Has logo:", !!logoBase64);

      // Enhanced prompt for professional flyer generation
      const enhancedPrompt = `Create a stunning professional event flyer design:
${prompt}

CRITICAL REQUIREMENTS:
- Ultra high resolution, 8k quality
- Cinematic lighting with dramatic shadows
- Modern, professional design
- Leave space at top and bottom for text overlay
- NO TEXT OR TYPOGRAPHY in the image
- Rich colors and atmospheric effects
${logoBase64 ? '- Incorporate the provided logo elegantly into the design' : ''}`;

      let requestBody: any;
      
      if (logoBase64) {
        requestBody = {
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: enhancedPrompt },
                { type: "image_url", image_url: { url: logoBase64 } }
              ]
            }
          ],
          modalities: ["image", "text"]
        };
      } else {
        requestBody = {
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            { role: "user", content: enhancedPrompt }
          ],
          modalities: ["image", "text"]
        };
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

      console.log("Returning base64 image");

      return new Response(
        JSON.stringify({ imageBase64 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Action non reconnue");

  } catch (error: any) {
    console.error("Generate flyer error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
