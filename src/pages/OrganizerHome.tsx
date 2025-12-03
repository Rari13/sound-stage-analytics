import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, TrendingUp, MapPin, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  banner_url: string | null;
  starts_at: string;
  city: string;
  venue: string;
  status: string;
  slug: string;
  tickets_sold?: number;
  revenue?: number;
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

  // Handle Stripe onboarding completion
  useEffect(() => {
    if (searchParams.get("stripe_onboarding") === "complete") {
      toast.success("Configuration Stripe terminée !");
      searchParams.delete("stripe_onboarding");
      setSearchParams(searchParams, { replace: true });

      if (user) {
        supabase
          .from("organizers")
          .select("id, name, stripe_account_id")
          .eq("owner_user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setOrganizer(data);
          });
      }
    }
  }, [searchParams, setSearchParams, user]);

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

      // Fetch upcoming events
      const now = new Date().toISOString();
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, banner_url, starts_at, city, venue, status, slug")
        .eq("organizer_id", orgData.id)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(3);

      // Fetch stats
      const { count: eventCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", orgData.id);

      const { count: followerCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", orgData.id);

      // Calculate tickets and revenue
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

      setEvents(eventsData || []);
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
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      toast.error("Impossible de configurer les paiements");
    } finally {
      setConnectingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Stripe Setup Banner */}
      {!organizer?.stripe_account_id && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Configurez vos paiements</p>
                <p className="text-xs text-muted-foreground">
                  Pour recevoir les revenus de vos billets
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleStripeConnect} disabled={connectingStripe}>
              {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : "Configurer"}
            </Button>
          </div>
        </Card>
      )}

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Prochains événements</h2>
          <Link to="/orga/events" className="text-sm text-primary font-medium">
            Voir tout
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/orga/events/edit/${event.id}`)}
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {event.banner_url ? (
                      <img
                        src={event.banner_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{event.title}</h3>
                      <Badge
                        variant={event.status === "published" ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {event.status === "published" ? "Publié" : "Brouillon"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.starts_at), "EEE d MMM", { locale: fr })}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.city}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Aucun événement à venir</p>
          </Card>
        )}
      </div>
    </div>
  );
}
