import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { openStripeCheckout, openExternalUrl } from "@/lib/browserUtils";

interface SubscriptionState {
  isPremium: boolean;
  trialActive: boolean;
  trialEnd: string | null;
  subscriptionEnd: string | null;
  status: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>({
    isPremium: false,
    trialActive: false,
    trialEnd: null,
    subscriptionEnd: null,
    status: null,
  });
  const [loading, setLoading] = useState(true);
  const [organizerId, setOrganizerId] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
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

      if (orgData) {
        setOrganizerId(orgData.id);
      }

      // Check Stripe subscription
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        setLoading(false);
        return;
      }

      setSubscription({
        isPremium: data?.isPremium || false,
        trialActive: data?.trialActive || false,
        trialEnd: data?.trialEnd || null,
        subscriptionEnd: data?.subscriptionEnd || null,
        status: data?.status || null,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const startCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout");
      
      if (error) throw error;
      if (data?.url) {
        await openExternalUrl(data.url);
      }
      return { success: true };
    } catch (error) {
      console.error("Error starting checkout:", error);
      return { success: false, error: "Failed to start checkout" };
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      if (data?.url) {
        await openStripeCheckout(data.url);
      }
      return { success: true };
    } catch (error) {
      console.error("Error opening portal:", error);
      return { success: false, error: "Failed to open portal" };
    }
  };

  return {
    subscription,
    loading,
    isPremium: subscription.isPremium,
    trialActive: subscription.trialActive,
    trialEnd: subscription.trialEnd,
    organizerId,
    startCheckout,
    openCustomerPortal,
    refreshSubscription: checkSubscription,
  };
};
