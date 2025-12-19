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

// Google OAuth JWT helper
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT secret manquant");
  }

  const credentials = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const oneHour = 3600;

  // JWT Header and Claims
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + oneHour,
    iat: now,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = encode(header);
  const encodedClaim = encode(claim);

  // Convert PEM to ArrayBuffer
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = credentials.private_key
    .substring(
      credentials.private_key.indexOf(pemHeader) + pemHeader.length,
      credentials.private_key.lastIndexOf(pemFooter)
    )
    .replace(/\s/g, "");

  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Sign with Web Crypto API
  const key = await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedClaim}`)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("Token error:", tokenData);
    throw new Error("Impossible d'obtenir le token Google");
  }

  return tokenData.access_token;
}

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

    const PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID");
    const LOCATION = "us-central1";

    if (!PROJECT_ID) {
      throw new Error("GOOGLE_PROJECT_ID manquant");
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
    const aspectRatio = format === 'story' ? '9:16' : '1:1';
    
    const finalPrompt = `A high quality professional event poster background for a ${style} party. ${stylePrompt}. ${vibe ? `Additional vibe: ${vibe}` : ''} Photorealistic, 8k, highly detailed, cinematic lighting. No text, no typography. Leave space for text overlay.`;

    console.log("Generating flyer with Imagen 3:", finalPrompt);

    // 3. GET GOOGLE ACCESS TOKEN
    const accessToken = await getGoogleAccessToken();

    // 4. APPEL GOOGLE VERTEX AI (IMAGEN 3)
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`;

    const aiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        instances: [{ prompt: finalPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectRatio,
          addWatermark: false,
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Imagen 3 error:", aiResponse.status, errorText);
      throw new Error(`Erreur Imagen: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    
    if (aiData.error) {
      console.error("Vertex AI Error:", aiData.error);
      throw new Error("Erreur Google Imagen: " + aiData.error.message);
    }

    const imageBase64 = aiData.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
      console.error("No image in response:", JSON.stringify(aiData));
      throw new Error("Aucune image générée par Imagen 3");
    }

    // 5. SAUVEGARDE DANS STORAGE
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

    // 6. ENREGISTREMENT EN BASE
    await supabase.from('generated_flyers').insert({
      organizer_id: organizerId,
      image_url: publicUrl,
      prompt_used: finalPrompt,
      style: style || 'techno'
    });

    console.log("Flyer generated with Imagen 3:", publicUrl);

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
