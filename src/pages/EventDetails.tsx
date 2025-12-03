import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Calendar, MapPin, ArrowLeft, Minus, Plus, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  banner_url: string | null;
  starts_at: string;
  ends_at: string;
  city: string;
  venue: string;
  status: string;
}

interface PriceTier {
  id: string;
  name: string;
  price_cents: number;
  quota: number | null;
  hidden: boolean | null;
}

const EventDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [guestEmailDialogOpen, setGuestEmailDialogOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;
      
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (eventData) {
        setEvent(eventData);
        const { data: tiers } = await supabase
          .from('price_tiers')
          .select('id, name, price_cents, quota, hidden')
          .eq('event_id', eventData.id)
          .or('hidden.is.null,hidden.eq.false')
          .order('price_cents');
        setPriceTiers(tiers || []);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [slug]);

  const updateQty = (id: string, delta: number) => {
    setQuantities(p => ({ ...p, [id]: Math.max(0, Math.min(10, (p[id] || 0) + delta)) }));
  };

  const totalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalAmount = priceTiers.reduce((sum, tier) => sum + (tier.price_cents * (quantities[tier.id] || 0)), 0);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { setEmailError("L'email est requis"); return false; }
    if (!emailRegex.test(email)) { setEmailError("Format d'email invalide"); return false; }
    if (email.length > 255) { setEmailError("L'email est trop long"); return false; }
    setEmailError("");
    return true;
  };

  const processCheckout = async (email: string | null) => {
    if (!email || !event) return;
    setCheckoutLoading(true);
    
    try {
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([tierId, qty]) => ({ tierId, qty }));

      const isFreeEvent = items.every(item => {
        const tier = priceTiers.find(t => t.id === item.tierId);
        return tier && tier.price_cents === 0;
      });

      if (isFreeEvent) {
        const { data, error } = await supabase.functions.invoke("create-free-reservation", {
          body: { eventId: event.id, items, customerEmail: email },
        });
        if (error) throw error;
        if (data?.orderId) {
          setGuestEmailDialogOpen(false);
          navigate(`/payment-success?session_id=${data.orderId}`);
          toast.success("Réservation confirmée !");
        }
      } else {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { eventId: event.id, items, customerEmail: email },
        });
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
          setGuestEmailDialogOpen(false);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la commande");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePayment = (mode: 'full' | 'split') => {
    if (totalTickets === 0) return toast.error("Sélectionnez un billet");
    
    if (mode === 'split') {
      toast.info("Création du groupe...", { description: "Fonctionnalité bientôt disponible" });
      return;
    }

    if (!user) {
      setGuestEmailDialogOpen(true);
      return;
    }
    processCheckout(user?.email || null);
  };

  const handleGuestCheckout = () => {
    if (!validateEmail(guestEmail)) return;
    processCheckout(guestEmail);
  };

  if (loading) {
    return <div className="min-h-screen bg-background animate-pulse" />;
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-semibold mb-4">Événement introuvable</h1>
        <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 font-sans">
      {/* Header - Floating Back Button */}
      <header className="fixed top-0 z-50 w-full p-4 pointer-events-none">
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full bg-background/90 backdrop-blur shadow-soft hover:bg-background pointer-events-auto"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      {/* Hero Image - Full Width */}
      <div className="h-[50vh] w-full relative">
        <img 
          src={event.banner_url || "/placeholder.svg"} 
          className="w-full h-full object-cover" 
          alt={event.title} 
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="px-6 -mt-10 relative z-10">
        <h1 className="text-4xl font-black mb-2 leading-tight">{event.title}</h1>
        {event.subtitle && (
          <p className="text-xl text-muted-foreground font-medium mb-6">{event.subtitle}</p>
        )}

        {/* Date & Location Cards */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
            <div className="h-10 w-10 bg-background rounded-full flex items-center justify-center shadow-soft">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">{format(new Date(event.starts_at), "d MMMM yyyy", { locale: fr })}</p>
              <p className="text-sm text-muted-foreground">{format(new Date(event.starts_at), "HH:mm", { locale: fr })}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
            <div className="h-10 w-10 bg-background rounded-full flex items-center justify-center shadow-soft">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">{event.venue}</p>
              <p className="text-sm text-muted-foreground">{event.city}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-3">À propos</h3>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Ticket Selection */}
        {priceTiers.length > 0 && (
          <div className="space-y-4 mb-8">
            <h3 className="font-bold text-lg">Billets</h3>
            {priceTiers.map(tier => (
              <div 
                key={tier.id} 
                className="flex justify-between items-center p-4 border border-border rounded-2xl shadow-soft bg-card"
              >
                <div>
                  <p className="font-bold">{tier.name}</p>
                  <p className="text-muted-foreground">
                    {tier.price_cents === 0 ? 'Gratuit' : `${(tier.price_cents / 100).toFixed(2)} €`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="rounded-full h-8 w-8" 
                    onClick={() => updateQty(tier.id, -1)}
                    disabled={(quantities[tier.id] || 0) === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-4 text-center font-bold tabular-nums">{quantities[tier.id] || 0}</span>
                  <Button 
                    size="icon" 
                    variant="default" 
                    className="rounded-full h-8 w-8" 
                    onClick={() => updateQty(tier.id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thumb Zone Bar - Apple Style */}
      {totalTickets > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border safe-bottom shadow-strong z-40 animate-slide-up">
          <div className="max-w-md mx-auto flex gap-3">
            <Button 
              className="flex-1 h-14 rounded-2xl font-bold text-lg shadow-medium animate-press"
              onClick={() => handlePayment('full')}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "Chargement..." : `Payer ${(totalAmount / 100).toFixed(2)} €`}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            {/* Group Pay Button (if > 1 ticket) */}
            {totalTickets > 1 && (
              <Button 
                variant="outline"
                className="h-14 w-14 rounded-2xl border-border bg-secondary animate-press"
                onClick={() => handlePayment('split')}
                title="Diviser la note"
              >
                <Users className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Guest Email Dialog */}
      <Dialog open={guestEmailDialogOpen} onOpenChange={setGuestEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalisez votre commande</DialogTitle>
            <DialogDescription>Entrez votre email pour recevoir vos billets</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <FloatingInput
              label="Adresse email"
              type="email"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => guestEmail && validateEmail(guestEmail)}
              onKeyDown={(e) => e.key === 'Enter' && handleGuestCheckout()}
              error={emailError}
              valid={!emailError && guestEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)}
              autoFocus
            />
            <Button variant="accent" className="w-full" size="lg" onClick={handleGuestCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? "Chargement..." : "Continuer"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setGuestEmailDialogOpen(false)} disabled={checkoutLoading}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetails;
