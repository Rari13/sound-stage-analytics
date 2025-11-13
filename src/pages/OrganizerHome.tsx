import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, TrendingUp, Plus, BarChart3, Scan, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

const OrganizerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      const { data: orgData } = await supabase
        .from('organizers')
        .select('id')
        .eq('owner_user_id', user.id)
        .single();

      if (!orgData) return;

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, banner_url, starts_at, city, venue, status, slug')
        .eq('organizer_id', orgData.id)
        .order('starts_at', { ascending: false });

      if (!eventsData) {
        setLoading(false);
        return;
      }

      // Fetch tickets and revenue stats for each event
      const eventsWithStats = await Promise.all(
        eventsData.map(async (event) => {
          // Count sold tickets
          const { count: ticketCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          // Calculate revenue from orders
          const { data: ordersData } = await supabase
            .from('orders')
            .select('amount_total_cents')
            .eq('event_id', event.id)
            .eq('status', 'completed');

          const revenue = ordersData?.reduce((sum, order) => sum + order.amount_total_cents, 0) || 0;

          return {
            ...event,
            tickets_sold: ticketCount || 0,
            revenue: revenue / 100, // Convert cents to euros
          };
        })
      );

      setEvents(eventsWithStats);
      setLoading(false);
    };

    fetchEvents();
  }, [user]);

  const handlePublish = async (eventId: string) => {
    setPublishing(eventId);
    const { error } = await supabase
      .from('events')
      .update({ status: 'published' })
      .eq('id', eventId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de publier l'événement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Événement publié",
        description: "Votre événement est maintenant visible par tous",
      });
      // Refresh events list
      setEvents(events.map(e => e.id === eventId ? { ...e, status: 'published' } : e));
    }
    setPublishing(null);
  };

  const handleEdit = (eventId: string) => {
    navigate(`/orga/events/edit/${eventId}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      published: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      draft: "Brouillon",
      published: "Publié",
      cancelled: "Annulé",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tableau de bord</h1>
            <p className="text-muted-foreground">Gérez vos événements</p>
          </div>
          <div className="flex gap-3">
            <Link to="/orga/scan">
              <Button variant="outline" size="lg">
                <Scan className="mr-2 h-5 w-5" />
                Scanner
              </Button>
            </Link>
            <Link to="/orga/events/create">
              <Button variant="hero" size="lg">
                <Plus className="mr-2" />
                Nouvel événement
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-2 hover:shadow-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Événements</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billets vendus</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-accent-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Followers</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mes événements</h2>
              <Link to="/orga/events/create">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un événement
                </Button>
              </Link>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-4">
                      <div className="w-32 h-20 bg-muted animate-pulse rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
                        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="p-4 hover:shadow-glow transition-base">
                    <div className="flex gap-4">
                      {event.banner_url ? (
                        <img 
                          src={event.banner_url} 
                          alt={event.title}
                          className="w-32 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-32 h-20 bg-gradient-primary rounded flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-primary-foreground opacity-50" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{event.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(event.starts_at), "d MMMM yyyy • HH:mm", { locale: fr })}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {event.venue}, {event.city}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{event.revenue?.toFixed(0) || 0} €</p>
                              <p className="text-xs text-muted-foreground">Revenus</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{event.tickets_sold || 0}</p>
                              <p className="text-xs text-muted-foreground">Billets vendus</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(event.status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/events/${event.slug}`}>
                            <Button variant="outline" size="sm">Voir</Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(event.id)}
                          >
                            Éditer
                          </Button>
                          {event.status === 'draft' && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handlePublish(event.id)}
                              disabled={publishing === event.id}
                            >
                              {publishing === event.id ? "Publication..." : "Publier"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xl font-semibold mb-2">Aucun événement</p>
                <p className="text-muted-foreground mb-6">
                  Créez votre premier événement pour commencer
                </p>
                <Link to="/orga/events/create">
                  <Button variant="hero">
                    <Plus className="mr-2" />
                    Créer un événement
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrganizerHome;
