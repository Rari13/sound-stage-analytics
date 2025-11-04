import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  subtitle: string | null;
  city: string;
  venue: string;
  starts_at: string;
  cover_image: any;
  music_genres: string[] | null;
}

const EventsBrowse = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, subtitle, city, venue, starts_at, cover_image, music_genres')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(20);

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Découvrir les événements</h1>
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">Aucun événement trouvé</p>
            <p className="text-muted-foreground">
              {searchTerm ? "Essayez une autre recherche" : "Revenez bientôt !"}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Link key={event.id} to={`/event/${event.id}`}>
                <Card className="overflow-hidden hover:shadow-glow transition-all cursor-pointer">
                  {event.cover_image?.url && (
                    <div className="h-48 bg-muted overflow-hidden">
                      <img
                        src={event.cover_image.url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{event.title}</h3>
                      {event.subtitle && (
                        <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(event.starts_at).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.venue}, {event.city}</span>
                      </div>
                    </div>
                    {event.music_genres && event.music_genres.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.music_genres.slice(0, 3).map((genre) => (
                          <span key={genre} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    <Button className="w-full" variant="outline">
                      Voir les détails
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsBrowse;
