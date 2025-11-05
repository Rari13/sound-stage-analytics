import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ticket, Calendar, Heart, User, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  subtitle: string | null;
  banner_url: string | null;
  starts_at: string;
  city: string;
  venue: string;
  slug: string;
}

const ClientHome = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, subtitle, banner_url, starts_at, city, venue, slug')
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(6);

      if (data) setEvents(data);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Découvrir</h1>
            <p className="text-muted-foreground">Les meilleurs événements près de chez vous</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <User className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Link to="/client/tickets">
            <Card className="p-6 space-y-2 hover:shadow-glow transition-base cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mes billets</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </Card>
          </Link>

          <Card className="p-6 space-y-2 hover:shadow-accent-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Événements à venir</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
            </div>
          </Card>

          <Link to="/client/follows">
            <Card className="p-6 space-y-2 hover:shadow-glow transition-base cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organisateurs suivis</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Événements à venir</h2>
            <Link to="/events/browse">
              <Button variant="outline">Voir tout</Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-muted animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-6 bg-muted animate-pulse rounded" />
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link key={event.id} to={`/events/${event.slug}`}>
                  <Card className="overflow-hidden hover:shadow-glow transition-base group">
                    {event.banner_url ? (
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={event.banner_url} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-primary flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-primary-foreground opacity-50" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-lg line-clamp-1">{event.title}</h3>
                      {event.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{event.subtitle}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.starts_at), "d MMM yyyy • HH:mm", { locale: fr })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.venue}, {event.city}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Aucun événement pour le moment</h3>
                  <p className="text-muted-foreground">Les prochains événements apparaîtront ici</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
