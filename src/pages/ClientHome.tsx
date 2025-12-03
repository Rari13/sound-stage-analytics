import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Search, MapPin, Calendar, Heart, SlidersHorizontal } from "lucide-react";
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
  latitude?: number | null;
  longitude?: number | null;
  price_tiers?: { price_cents: number }[];
}

const ClientHome = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userCity, setUserCity] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserCity();
    }
    fetchEvents();
  }, [user]);

  const fetchUserCity = async () => {
    const { data } = await supabase
      .from('client_profiles')
      .select('city')
      .eq('user_id', user?.id)
      .maybeSingle();
    if (data?.city) setUserCity(data.city);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, subtitle, banner_url, starts_at, city, venue, slug, music_genres, latitude, longitude, price_tiers(price_cents)')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(50);

    if (data) setEvents(data as Event[]);
    setLoading(false);
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-secondary/30 pb-28">
      {/* Header - Sticky, Clean White */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border p-4">
        <div className="flex items-center justify-between mb-4 max-w-lg mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Découvrir</h1>
          <Link to="/client/follows">
            <Button size="icon" variant="ghost" className="rounded-full hover:bg-secondary">
              <Heart className="h-6 w-6" />
            </Button>
          </Link>
        </div>

        <div className="flex gap-3 max-w-lg mx-auto">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input 
              placeholder="Artiste, lieu, ville..." 
              className="pl-10 h-12 bg-secondary border-none rounded-2xl text-base focus:ring-1 focus:ring-ring transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link to="/events/browse">
            <Button size="icon" variant="outline" className="h-12 w-12 rounded-2xl border-border bg-background shadow-soft hover:shadow-medium transition-all">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Feed - Floating White Cards */}
      <div className="container max-w-lg mx-auto p-4 space-y-6 mt-2">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-80 w-full rounded-3xl" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun événement trouvé</h3>
            <p className="text-muted-foreground">Essayez une autre recherche</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const minPrice = event.price_tiers?.length 
              ? Math.min(...event.price_tiers.map((t) => t.price_cents)) / 100 
              : 0;

            return (
              <Link to={`/events/${event.slug}`} key={event.id} className="block group">
                <div className="bg-card rounded-3xl shadow-card overflow-hidden border border-border animate-press transition-all hover:shadow-card-hover">
                  {/* Image */}
                  <AspectRatio ratio={4/3} className="bg-secondary relative">
                    <img 
                      src={event.banner_url || "/placeholder.svg"} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-soft">
                      <span className="text-sm font-bold">
                        {minPrice === 0 ? "Gratuit" : `${minPrice} €`}
                      </span>
                    </div>
                  </AspectRatio>

                  {/* Content */}
                  <div className="p-5">
                    <h2 className="text-xl font-bold leading-tight mb-2 group-hover:text-muted-foreground transition-colors">
                      {event.title}
                    </h2>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.starts_at), "EEE d MMM • HH:mm", { locale: fr })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {event.city}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ClientHome;
