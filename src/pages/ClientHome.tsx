import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ticket, Calendar, Heart, User, MapPin, Settings } from "lucide-react";
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
  music_genres: string[] | null;
  published_at: string | null;
}

const ClientHome = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState<{
    city: string | null;
    preferred_genres: string[] | null;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserPreferences();
    }
  }, [user]);

  useEffect(() => {
    if (userPreferences !== null) {
      fetchEvents();
    }
  }, [userPreferences]);

  const fetchUserPreferences = async () => {
    const { data } = await supabase
      .from('client_profiles')
      .select('city, preferred_genres')
      .eq('user_id', user?.id)
      .single();

    setUserPreferences(data || { city: null, preferred_genres: null });
  };

  const fetchEvents = async () => {
    let query = supabase
      .from('events')
      .select('id, title, subtitle, banner_url, starts_at, city, venue, slug, music_genres, published_at')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString());

    // Filter by city if user has preferences
    if (userPreferences?.city) {
      query = query.ilike('city', `%${userPreferences.city}%`);
    }

    // Sort by published date (newest first) then by start date
    query = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('starts_at', { ascending: true })
      .limit(12);

    const { data } = await query;

    if (data) {
      // If user has genre preferences, boost events matching those genres
      if (userPreferences?.preferred_genres && userPreferences.preferred_genres.length > 0) {
        const sortedEvents = data.sort((a, b) => {
          const aMatches = a.music_genres?.filter(g => 
            userPreferences.preferred_genres?.includes(g)
          ).length || 0;
          const bMatches = b.music_genres?.filter(g => 
            userPreferences.preferred_genres?.includes(g)
          ).length || 0;
          return bMatches - aMatches;
        });
        setEvents(sortedEvents);
      } else {
        setEvents(data);
      }
    }
    setLoading(false);
  };

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
            <p className="text-muted-foreground">
              {userPreferences?.city 
                ? `Les meilleurs événements à ${userPreferences.city}` 
                : "Les meilleurs événements près de chez vous"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/client/profile">
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <User className="h-5 w-5" />
            </Button>
          </div>
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
            <h2 className="text-2xl font-bold">
              {userPreferences?.preferred_genres && userPreferences.preferred_genres.length > 0
                ? "Recommandé pour vous"
                : "Nouveaux événements"}
            </h2>
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
                      {event.music_genres && event.music_genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.music_genres.slice(0, 2).map((genre) => (
                            <span key={genre} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                              {genre}
                            </span>
                          ))}
                        </div>
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
