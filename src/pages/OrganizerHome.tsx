import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, MapPin, Loader2, Plus, RotateCcw, ArrowRight, Ticket } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { PostEventSurvey } from "@/components/PostEventSurvey";

interface Event {
  id: string;
  title: string;
  banner_url: string | null;
  starts_at: string;
  city: string;
  venue: string;
  status: string;
  slug: string;
}

interface Organizer {
  id: string;
  name: string;
  stripe_account_id: string | null;
}

interface Stats {
  totalRevenue: number;
  totalTickets: number;
}

export default function OrganizerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalTickets: 0 });
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [surveyEvent, setSurveyEvent] = useState<{ id: string; title: string } | null>(null);
  const [pendingRefunds, setPendingRefunds] = useState(0);

  useEffect(() => {
    if (searchParams.get("stripe_onboarding") === "complete") {
      toast.success("Paiements configurés !");
      searchParams.delete("stripe_onboarding");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizers")
        .select("id, name, stripe_account_id")
        .eq("owner_user_id", user.id)
        .single();

      if (!orgData) {
        setLoading(false);
        return;
      }

      setOrganizer(orgData);

      const now = new Date().toISOString();
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, banner_url, starts_at, city, venue, status, slug")
        .eq("organizer_id", orgData.id)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(2);

      setEvents(eventsData || []);

      // Check for post-event survey
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const { data: recentEndedEvents } = await supabase
        .from("events")
        .select("id, title, survey_completed_at")
        .eq("organizer_id", orgData.id)
        .lt("ends_at", now)
        .gt("ends_at", threeDaysAgo.toISOString())
        .is("survey_completed_at", null)
        .limit(1);

      if (recentEndedEvents && recentEndedEvents.length > 0) {
        const event = recentEndedEvents[0];
        setSurveyEvent({ id: event.id, title: event.title });
      }

      // Fetch pending refund requests count
      const { count: refundCount } = await supabase
        .from("refund_requests")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", orgData.id)
        .eq("status", "pending");
      
      setPendingRefunds(refundCount || 0);

      // Fetch stats
      const { data: allEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", orgData.id);

      let totalTickets = 0;
      let totalRevenue = 0;

      if (allEvents && allEvents.length > 0) {
        const eventIds = allEvents.map((e) => e.id);

        const { count: ticketCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds);

        const { data: ordersData } = await supabase
          .from("orders")
          .select("amount_total_cents")
          .in("event_id", eventIds)
          .eq("status", "completed");

        totalTickets = ticketCount || 0;
        totalRevenue = ordersData?.reduce((sum, o) => sum + o.amount_total_cents, 0) || 0;
      }

      setStats({
        totalTickets,
        totalRevenue: totalRevenue / 100,
      });

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleStripeConnect = async () => {
    if (!organizer) return;
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-connect-account", {
        body: { organizerId: organizer.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_self");
    } catch (error) {
      toast.error("Erreur de connexion Stripe");
    } finally {
      setConnectingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Bonjour 👋</h1>
          <p className="text-muted-foreground text-sm">{organizer?.name}</p>
        </div>
        <Button size="sm" onClick={() => navigate("/orga/events/create")} className="rounded-full">
          <Plus className="h-4 w-4 mr-1" />
          Créer
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-primary text-primary-foreground">
          <DollarSign className="h-5 w-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)}€</p>
          <p className="text-xs opacity-80">Revenus totaux</p>
        </Card>
        <Card className="p-4">
          <Users className="h-5 w-5 mb-2 text-primary" />
          <p className="text-2xl font-bold">{stats.totalTickets}</p>
          <p className="text-xs text-muted-foreground">Billets vendus</p>
        </Card>
      </div>

      {/* Alerts */}
      {pendingRefunds > 0 && (
        <div 
          className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-orange-100 transition-colors"
          onClick={() => navigate("/orga/refunds")}
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-800">
              {pendingRefunds} demande{pendingRefunds > 1 ? 's' : ''} de remboursement
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-orange-400" />
        </div>
      )}

      {!organizer?.stripe_account_id && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
          <span className="text-sm font-medium text-amber-800">Activez les paiements</span>
          <Button size="sm" variant="outline" className="h-8" onClick={handleStripeConnect} disabled={connectingStripe}>
            {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activer"}
          </Button>
        </div>
      )}

      {/* Promo Codes Quick Access */}
      <div 
        className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => navigate("/orga/promo-codes")}
      >
        <div className="flex items-center gap-3">
          <Ticket className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Codes Promo</span>
        </div>
        <ArrowRight className="h-4 w-4 text-primary/60" />
      </div>

      {/* Events */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Prochains événements</h2>
          <Link to="/orga/events" className="text-sm text-primary">
            Voir tout
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-card rounded-xl p-3 flex gap-3 border shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/orga/events/edit/${event.id}`)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img src={event.banner_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-medium text-sm truncate">{event.title}</h3>
                    <Badge variant={event.status === "published" ? "default" : "secondary"} className="text-[10px] h-5 shrink-0">
                      {event.status === "published" ? "Live" : "Brouillon"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(event.starts_at), "d MMM, HH:mm", { locale: fr })}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.city}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-secondary/30 rounded-xl border border-dashed">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">Aucun événement prévu</p>
          </div>
        )}
      </div>

      {/* Survey Modal */}
      {surveyEvent && (
        <PostEventSurvey 
          isOpen={true} 
          onClose={() => setSurveyEvent(null)} 
          event={surveyEvent} 
        />
      )}
    </div>
  );
}