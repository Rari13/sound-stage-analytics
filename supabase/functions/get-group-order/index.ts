import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shareCode } = await req.json();

    if (!shareCode || typeof shareCode !== "string" || shareCode.length > 50) {
      console.error("Missing or invalid shareCode");
      return new Response(JSON.stringify({ error: "Share code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching group order for share code: ${shareCode}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get the authenticated user from the request
    let authenticatedUserEmail: string | null = null;
    let authenticatedUserId: string | null = null;
    
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      if (user) {
        authenticatedUserEmail = user.email?.toLowerCase() || null;
        authenticatedUserId = user.id;
        console.log(`Authenticated user: ${authenticatedUserEmail}`);
      }
    }

    // Fetch group order with event details using service role (bypasses RLS)
    const { data: groupOrder, error: orderError } = await supabase
      .from("group_orders")
      .select(`
        id,
        event_id,
        creator_user_id,
        total_tickets,
        price_per_ticket_cents,
        share_code,
        status,
        expires_at,
        events (
          title,
          subtitle,
          banner_url,
          venue,
          city,
          starts_at
        )
      `)
      .eq("share_code", shareCode)
      .maybeSingle();

    if (orderError) {
      console.error("Error fetching group order:", orderError);
      return new Response(JSON.stringify({ error: "Failed to fetch group order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!groupOrder) {
      console.log("Group order not found for share code:", shareCode);
      return new Response(JSON.stringify({ error: "Group not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from("group_order_participants")
      .select("id, email, amount_cents, status, user_id, paid_at")
      .eq("group_order_id", groupOrder.id)
      .order("created_at");

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return new Response(JSON.stringify({ error: "Failed to fetch participants" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mask emails for privacy and perform server-side user matching
    // SECURITY: Never expose originalEmail to the client
    const maskedParticipants = (participants || []).map((p) => {
      const [local, domain] = p.email.split("@");
      const maskedEmail = local.length > 2 
        ? `${local.substring(0, 2)}***@${domain}`
        : `${local[0]}***@${domain}`;
      
      // Server-side matching - check if this participant is the authenticated user
      const isCurrentUser = authenticatedUserEmail 
        ? p.email.toLowerCase() === authenticatedUserEmail || p.user_id === authenticatedUserId
        : false;
      
      return {
        id: p.id,
        email: maskedEmail,
        amount_cents: p.amount_cents,
        status: p.status,
        user_id: p.user_id,
        paid_at: p.paid_at,
        isCurrentUser, // Server-side computed flag - no email leaked
      };
    });

    console.log(`Found group order with ${maskedParticipants.length} participants`);

    return new Response(
      JSON.stringify({
        groupOrder,
        participants: maskedParticipants,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in get-group-order:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
