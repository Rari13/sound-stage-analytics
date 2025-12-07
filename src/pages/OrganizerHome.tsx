import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, TrendingUp, MapPin, Loader2, Plus, RotateCcw } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { StrategyTips } from "@/components/StrategyTips";
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
  capacity: number | null;
}

interface Organizer {
  id: string;
  name: string;
  stripe_account_id: string | null;
}

interface Stats {
  totalEvents: number;
  totalTickets: number;
  totalRevenue: number;
  followers: number;
}

export default function OrganizerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [stats, setStats] = useState<Stats>({ totalEvents: 0, totalTickets: 0, totalRevenue: 0, followers: 0 });
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [eventTicketCounts, setEventTicketCounts] = useState<Record<string, number>>({});
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
        .select("id, title, banner_url, starts_at, city, venue, status, slug, capacity")
        .eq("organizer_id", orgData.id)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(3);

      setEvents(eventsData || []);

      if (eventsData) {
        const counts: Record<string, number> = {};
        for (const event of eventsData) {
          const { count } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);
          counts[event.id] = count || 0;
        }
        setEventTicketCounts(counts);
      }

      // Check for post-event survey - only show for events that ended and haven't been surveyed yet
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
      const { count: eventCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", orgData.id);

      const { count: followerCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", orgData.id);

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
        totalEvents: eventCount || 0,
        totalTickets,
        totalRevenue: totalRevenue / 100,
        followers: followerCount || 0,
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
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  const nextEvent = events[0];

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bonjour, {organizer?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Voici ce qui se passe aujourd'hui.</p>
        </div>
        <Button onClick={() => navigate("/orga/events/create")} className="rounded-full shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5 mr-2" />
          Créer
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalEvents}</p>
              <p className="text-xs text-muted-foreground">Événements</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">Revenus</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTickets}</p>
              <p className="text-xs text-muted-foreground">Billets vendus</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.followers}</p>
              <p className="text-xs text-muted-foreground">Abonnés</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Strategic Tip Section */}
      {nextEvent && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Conseil Stratégique</h2>
          <StrategyTips 
            daysLeft={differenceInDays(new Date(nextEvent.starts_at), new Date())}
            ticketsSold={eventTicketCounts[nextEvent.id] || 0}
            capacity={nextEvent.capacity || 100}
          />
        </div>
      )}

      {/* Refund Requests Alert */}
      {pendingRefunds > 0 && (
        <div 
          className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:bg-orange-500/15 transition-colors"
          onClick={() => navigate("/orga/refunds")}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-sm text-orange-900 dark:text-orange-100">
                {pendingRefunds} demande{pendingRefunds > 1 ? 's' : ''} de remboursement
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">En attente de votre réponse</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="bg-white/50 border-orange-200 hover:bg-white">
            Voir
          </Button>
        </div>
      )}

      {/* Stripe Alert */}
      {!organizer?.stripe_account_id && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">€</div>
            <div>
              <p className="font-bold text-sm text-amber-900 dark:text-amber-100">Activez les paiements</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">Pour recevoir votre argent</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="bg-white/50 border-amber-200 hover:bg-white" onClick={handleStripeConnect} disabled={connectingStripe}>
            {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activer"}
          </Button>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Prochains événements</h2>
          <Link to="/orga/events" className="text-sm font-medium text-primary hover:underline">
            Voir tout
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="group relative bg-card rounded-2xl p-3 flex gap-4 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/orga/events/edit/${event.id}`)}
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 relative">
                  <img src={event.banner_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="flex-1 py-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold truncate pr-2">{event.title}</h3>
                    <Badge variant={event.status === "published" ? "default" : "secondary"} className="text-[10px] px-2 h-5">
                      {event.status === "published" ? "En ligne" : "Brouillon"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(event.starts_at), "d MMM, HH:mm", { locale: fr })}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.city}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary/30 rounded-3xl border border-dashed border-border">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">Rien de prévu pour l'instant</p>
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
