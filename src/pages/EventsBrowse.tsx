import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Search, ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const MUSIC_GENRES = [
  "Hip-Hop", "Rap", "R&B", "Pop", "Rock", "Électro", "Techno", "House",
  "Jazz", "Reggae", "Soul", "Funk", "Metal", "Indie", "Afrobeat", "Dancehall"
];

interface Event {
  id: string;
  title: string;
  subtitle: string | null;
  city: string;
  venue: string;
  starts_at: string;
  slug: string;
  cover_image: any;
  banner_url: string | null;
  music_genres: string[] | null;
}

const EventsBrowse = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, subtitle, city, venue, starts_at, slug, cover_image, banner_url, music_genres')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(20);

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGenre = selectedGenre === "all" || 
        (event.music_genres && event.music_genres.includes(selectedGenre));
      
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      } else if (sortBy === "recent") {
        return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
      } else if (sortBy === "city") {
        return a.city.localeCompare(b.city);
      }
      return 0;
    });

  const clearFilters = () => {
    setSelectedGenre("all");
    setSortBy("date");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedGenre !== "all" || sortBy !== "date" || searchTerm;

  const getEventImage = (event: Event) => {
    return event.banner_url || event.cover_image?.url || null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Fixed */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-secondary border-0"
              />
            </div>

            {/* Filter Sheet for Mobile */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-3xl">
                <SheetHeader className="pb-4">
                  <SheetTitle>Filtres</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 pb-8">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Genre musical</label>
                    <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Tous les genres" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les genres</SelectItem>
                        {MUSIC_GENRES.map((genre) => (
                          <SelectItem key={genre} value={genre}>
                            {genre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Trier par</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date (plus proche)</SelectItem>
                        <SelectItem value="recent">Date (plus récent)</SelectItem>
                        <SelectItem value="city">Ville (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Réinitialiser les filtres
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-6">
          {filteredEvents.length > 0 
            ? `${filteredEvents.length} événement${filteredEvents.length > 1 ? 's' : ''}`
            : 'Événements'
          }
        </h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-28 h-28 md:w-32 md:h-32 bg-muted rounded-xl shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-semibold mb-1">Aucun événement trouvé</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Essayez une autre recherche" : "Revenez bientôt !"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Link 
                key={event.id} 
                to={`/events/${event.slug}`}
                className="flex flex-col bg-card rounded-2xl overflow-hidden border border-border hover:shadow-card-hover transition-shadow duration-200"
              >
                {/* Image - 4:5 ratio on mobile, 16:9 on desktop */}
                <div className="aspect-4/5 md:aspect-video bg-muted relative overflow-hidden">
                  {getEventImage(event) ? (
                    <img
                      src={getEventImage(event)!}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Date badge */}
                  <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <p className="text-xs font-semibold">
                      {new Date(event.starts_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold line-clamp-1">{event.title}</h3>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1">{event.venue}, {event.city}</span>
                  </div>

                  {event.music_genres && event.music_genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {event.music_genres.slice(0, 2).map((genre) => (
                        <span 
                          key={genre} 
                          className="px-2 py-0.5 bg-secondary text-xs rounded-full"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EventsBrowse;
