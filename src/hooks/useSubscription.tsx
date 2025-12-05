import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Subscription {
  id: string;
  plan_type: "free" | "premium";
  status: "active" | "cancelled" | "expired";
  expires_at: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizerId, setOrganizerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get organizer ID
        const { data: orgData } = await supabase
          .from("organizers")
          .select("id")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        if (!orgData) {
          setLoading(false);
          return;
        }

        setOrganizerId(orgData.id);

        // Get subscription
        const { data: subData } = await supabase
          .from("organizer_subscriptions")
          .select("*")
          .eq("organizer_id", orgData.id)
          .eq("status", "active")
          .maybeSingle();

        setSubscription(subData as Subscription);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const isPremium = subscription?.plan_type === "premium" && subscription?.status === "active";

  const upgradeToPremium = async () => {
    if (!organizerId) return { error: "Organizer not found", success: false };

    try {
      // Check if subscription exists
      const { data: existingSub } = await supabase
        .from("organizer_subscriptions")
        .select("id")
        .eq("organizer_id", organizerId)
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from("organizer_subscriptions")
          .update({
            plan_type: "premium",
            status: "active",
            monthly_price_cents: 15000, // 150€ Sound Pro + IA
            started_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("organizer_subscriptions")
          .insert({
            organizer_id: organizerId,
            plan_type: "premium",
            status: "active",
            monthly_price_cents: 15000,
          });

        if (error) throw error;
      }

      // Refresh subscription data
      const { data: subData } = await supabase
        .from("organizer_subscriptions")
        .select("*")
        .eq("organizer_id", organizerId)
        .eq("status", "active")
        .maybeSingle();

      setSubscription(subData as Subscription);

      return { success: true };
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      return { error: "Failed to upgrade subscription", success: false };
    }
  };

  return {
    subscription,
    loading,
    isPremium,
    organizerId,
    upgradeToPremium,
  };
};
