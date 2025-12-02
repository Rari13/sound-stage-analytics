import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Calendar, MapPin, Clock, ArrowLeft, Minus, Plus, Ticket, Check } from "lucide-react";
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
  capacity: number | null;
}

interface PriceTier {
  id: string;
  name: string;
  price_cents: number;
  quota: number | null;
  hidden: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
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
    const fetchEventDetails = async () => {
      if (!slug) return;

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      setEvent(eventData);

      const { data: tiersData } = await supabase
        .from('price_tiers')
        .select('id, name, price_cents, quota, hidden, starts_at, ends_at')
        .eq('event_id', eventData.id)
        .or('hidden.is.null,hidden.eq.false')
        .order('price_cents');

      if (tiersData) {
        setPriceTiers(tiersData);
      }

      setLoading(false);
    };

    fetchEventDetails();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="aspect-4/5 md:aspect-video bg-muted" />
          <div className="p-4 space-y-4">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-semibold mb-4">Événement introuvable</h1>
        <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  const updateQuantity = (tierId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[tierId] || 0;
      const newQty = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [tierId]: newQty };
    });
  };

  const totalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalAmount = priceTiers.reduce((sum, tier) => {
    const qty = quantities[tier.id] || 0;
    return sum + (tier.price_cents * qty);
  }, 0);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("L'email est requis");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Format d'email invalide");
      return false;
    }
    if (email.length > 255) {
      setEmailError("L'email est trop long");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleCheckout = async () => {
    if (totalTickets === 0) {
      toast.error("Sélectionnez au moins un billet");
      return;
    }

    if (!user) {
      setGuestEmailDialogOpen(true);
      return;
    }

    await processCheckout(user?.email || null);
  };

  const processCheckout = async (email: string | null) => {
    if (!email) {
      toast.error("Email requis");
      return;
    }

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
          setGuestEmail("");
          navigate(`/payment-success?session_id=${data.orderId}`);
          toast.success("Réservation confirmée !");
        } else {
          throw new Error("No order ID returned");
        }
      } else {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { eventId: event.id, items, customerEmail: email },
        });

        if (error) throw error;

        if (data?.url) {
          window.open(data.url, '_blank');
          setGuestEmailDialogOpen(false);
          setGuestEmail("");
        } else {
          throw new Error("No checkout URL returned");
        }
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Erreur lors de la commande");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleGuestCheckout = () => {
    if (!validateEmail(guestEmail)) return;
    processCheckout(guestEmail);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header with back button */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Hero Image - 4:5 on mobile */}
      <div className="aspect-4/5 md:aspect-video relative overflow-hidden bg-muted">
        {event.banner_url ? (
          <img 
            src={event.banner_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Calendar className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-6 relative z-10">
        <Card className="p-5 space-y-6">
          {/* Event Info */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            {event.subtitle && (
              <p className="text-muted-foreground">{event.subtitle}</p>
            )}
          </div>

          {/* Date & Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {format(new Date(event.starts_at), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-muted-foreground">
                  {format(new Date(event.starts_at), "HH:mm", { locale: fr })} - {format(new Date(event.ends_at), "HH:mm", { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{event.venue}</p>
                <p className="text-muted-foreground">{event.city}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="pt-4 border-t">
              <h2 className="font-semibold mb-3">À propos</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Tickets */}
          {priceTiers.length > 0 && (
            <div className="pt-4 border-t">
              <h2 className="font-semibold mb-4">Billets</h2>
              <div className="space-y-3">
                {priceTiers.map((tier) => {
                  const qty = quantities[tier.id] || 0;
                  const isSelected = qty > 0;
                  
                  return (
                    <div 
                      key={tier.id} 
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{tier.name}</h3>
                            {isSelected && (
                              <Check className="h-4 w-4 text-success animate-check" />
                            )}
                          </div>
                          <p className="text-lg font-semibold mt-1">
                            {tier.price_cents === 0 
                              ? 'Gratuit' 
                              : `${(tier.price_cents / 100).toFixed(2)} €`
                            }
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(tier.id, -1)}
                            disabled={qty === 0}
                            className="h-10 w-10"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold tabular-nums">
                            {qty}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(tier.id, 1)}
                            disabled={qty >= 10}
                            className="h-10 w-10"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Fixed Bottom Bar - Thumb Zone */}
      {priceTiers.length > 0 && (
        <div className="thumb-zone-bar animate-slide-up">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  {totalTickets > 0 ? `${totalTickets} billet${totalTickets > 1 ? 's' : ''}` : 'Sélectionnez vos billets'}
                </p>
                <p className="text-xl font-bold">
                  {(totalAmount / 100).toFixed(2)} €
                </p>
              </div>
              
              <Button 
                variant="accent"
                size="lg"
                onClick={handleCheckout}
                disabled={totalTickets === 0 || checkoutLoading}
                className="shrink-0 px-8"
              >
                {checkoutLoading ? (
                  <span className="animate-pulse">Chargement...</span>
                ) : (
                  <>
                    <Ticket className="h-5 w-5 mr-2" />
                    {totalAmount === 0 ? 'Réserver' : 'Payer'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Email Dialog */}
      <Dialog open={guestEmailDialogOpen} onOpenChange={setGuestEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalisez votre commande</DialogTitle>
            <DialogDescription>
              Entrez votre email pour recevoir vos billets
            </DialogDescription>
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
            <Button 
              variant="accent"
              className="w-full" 
              size="lg"
              onClick={handleGuestCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "Chargement..." : "Continuer"}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => setGuestEmailDialogOpen(false)}
              disabled={checkoutLoading}
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetails;
