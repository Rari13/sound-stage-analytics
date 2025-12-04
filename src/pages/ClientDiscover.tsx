import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { X, Heart, MapPin, Calendar, SlidersHorizontal, Loader2, Clock, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  subtitle: string | null;
  banner_url: string | null;
  starts_at: string;
  city: string;
  venue: string;
  slug: string;
  price_tiers?: { id: string; name: string; price_cents: number }[];
}

// --- CARTE SWIPE ---
const SwipeCard = ({ 
  event, 
  onSwipe, 
  onLongPressStart, 
  onLongPressEnd 
}: { 
  event: Event;
  onSwipe: (dir: 'left' | 'right') => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const bgLike = useTransform(x, [0, 150], ["rgba(0,0,0,0)", "rgba(34, 197, 94, 0.2)"]);
  const bgDislike = useTransform(x, [-150, 0], ["rgba(239, 68, 68, 0.2)", "rgba(0,0,0,0)"]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gestion Long Press (600ms)
  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => onLongPressStart(), 600);
  };
  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onLongPressEnd();
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
  };

  const minPrice = event.price_tiers?.length ? Math.min(...event.price_tiers.map((t) => t.price_cents)) / 100 : 0;

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className="absolute top-0 w-full h-[70vh] rounded-[2rem] overflow-hidden shadow-card-hover bg-card cursor-grab active:cursor-grabbing border border-border"
    >
      <img src={event.banner_url || "/placeholder.svg"} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-transparent to-transparent" />
      
      <motion.div style={{ backgroundColor: bgLike }} className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <Heart className="w-32 h-32 text-background fill-current opacity-40" />
      </motion.div>
      <motion.div style={{ backgroundColor: bgDislike }} className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <X className="w-32 h-32 text-background opacity-40" />
      </motion.div>

      <div className="absolute top-6 right-6">
        <Badge className="bg-background/90 text-foreground text-lg font-bold px-4 py-1.5 backdrop-blur-md shadow-soft">
          {minPrice === 0 ? "Gratuit" : `${minPrice}€`}
        </Badge>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 text-background space-y-2 pb-12">
        <h2 className="text-4xl font-bold leading-none drop-shadow-lg">{event.title}</h2>
        <div className="flex flex-col gap-1 text-lg font-medium text-background/80">
          <span className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {format(new Date(event.starts_at), "d MMM", { locale: fr })}</span>
          <span className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {event.city}</span>
        </div>
      </div>
    </motion.div>
  );
};

// --- MODALE QUICK VIEW (Peek) ---
const QuickViewModal = ({ event }: { event: Event }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md animate-in fade-in duration-200">
    <div className="bg-background w-[85%] rounded-3xl p-6 shadow-card-hover text-center space-y-4 pointer-events-none border border-border animate-scale-in">
      <div className="w-12 h-1 bg-border rounded-full mx-auto mb-2" />
      <h3 className="text-2xl font-black leading-tight">{event.title}</h3>
      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="bg-secondary p-3 rounded-2xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-1"><Clock className="h-3 w-3" /> Heure</div>
          <p className="font-bold">{format(new Date(event.starts_at), "HH:mm")}</p>
        </div>
        <div className="bg-secondary p-3 rounded-2xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-1"><MapPin className="h-3 w-3" /> Lieu</div>
          <p className="font-bold truncate">{event.venue}</p>
        </div>
        <div className="bg-secondary p-3 rounded-2xl border border-border col-span-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-1"><Euro className="h-3 w-3" /> Tarifs</div>
          <div className="flex flex-wrap gap-2">
            {event.price_tiers?.map((t) => (
              <span key={t.id} className="text-xs font-medium bg-background border border-border px-2 py-1 rounded-md">{t.name}: {(t.price_cents/100)}€</span>
            ))}
            {!event.price_tiers?.length && <span className="text-xs text-muted-foreground">Gratuit</span>}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium">Relâchez pour revenir</p>
    </div>
  </div>
);

const ClientDiscover = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxPrice, setMaxPrice] = useState([50]);
  const [quickViewEvent, setQuickViewEvent] = useState<Event | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, subtitle, banner_url, starts_at, city, venue, slug, price_tiers(id, name, price_cents)')
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString())
        .limit(20);
      if (data) setEvents(data as Event[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleSwipe = async (direction: 'left' | 'right', event: Event) => {
    setEvents(prev => prev.filter(e => e.id !== event.id));
    if (direction === 'right') {
      toast.success("Ajouté aux favoris !");
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col items-center bg-secondary/30 p-4 overflow-hidden relative select-none">
      
      {/* Quick View Overlay (Si Long Press actif) */}
      {quickViewEvent && <QuickViewModal event={quickViewEvent} />}

      {/* Header Filtres */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 z-10 px-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tighter">Swipe</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border bg-background shadow-soft hover:shadow-medium">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="rounded-b-3xl">
            <SheetHeader><SheetTitle>Filtres</SheetTitle></SheetHeader>
            <div className="py-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between"><Label>Budget max</Label><span className="font-bold">{maxPrice[0]} €</span></div>
                <Slider value={maxPrice} onValueChange={setMaxPrice} max={100} step={5} />
              </div>
              <Button className="w-full h-12 text-lg font-bold rounded-xl">Appliquer</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Pile de Cartes */}
      <div className="w-full max-w-md h-[70vh] relative mt-4">
        <AnimatePresence>
          {events.length > 0 ? (
            events.slice(0, 3).reverse().map((event) => (
              <SwipeCard 
                key={event.id} 
                event={event} 
                onSwipe={(dir) => handleSwipe(dir, event)}
                onLongPressStart={() => setQuickViewEvent(event)}
                onLongPressEnd={() => setQuickViewEvent(null)}
              />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground font-medium">Recherche de pépites...</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions (Boutons bas) */}
      {events.length > 0 && (
        <div className="flex items-center gap-8 mt-8 z-10">
          <Button 
            size="icon" 
            className="h-16 w-16 rounded-full bg-background text-destructive shadow-medium hover:scale-110 transition-transform border border-destructive/10" 
            onClick={() => events[0] && handleSwipe('left', events[0])}
          >
            <X className="h-8 w-8" />
          </Button>
          <Button 
            size="icon" 
            className="h-16 w-16 rounded-full bg-background text-success shadow-medium hover:scale-110 transition-transform border border-success/10" 
            onClick={() => events[0] && handleSwipe('right', events[0])}
          >
            <Heart className="h-8 w-8 fill-current" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClientDiscover;
