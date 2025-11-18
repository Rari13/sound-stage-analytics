import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Clock, ArrowLeft, Users, Euro, Minus, Plus, ShoppingCart } from "lucide-react";
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
        .select('id, name, price_cents, quota')
        .eq('event_id', eventData.id)
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Événement introuvable</h1>
        <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  const updateQuantity = (tierId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[tierId] || 0;
      const newQty = Math.max(0, Math.min(10, current + delta)); // Max 10 per tier
      return { ...prev, [tierId]: newQty };
    });
  };

  const totalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalAmount = priceTiers.reduce((sum, tier) => {
    const qty = quantities[tier.id] || 0;
    return sum + (tier.price_cents * qty);
  }, 0);

  const handleCheckout = async () => {
    if (totalTickets === 0) {
      toast.error("Veuillez sélectionner au moins un billet");
      return;
    }

    // If user is not logged in and event is not free, ask for email
    if (!user && totalAmount > 0) {
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

      // Check if this is a free reservation
      const isFree = totalAmount === 0;
      const functionName = isFree ? "create-free-reservation" : "create-checkout";

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { eventId: event.id, items, customerEmail: email },
      });

      if (error) throw error;

      if (data?.url) {
        if (isFree) {
          // For free reservations, redirect directly (no payment needed)
          navigate(data.url.replace(window.location.origin, ''));
        } else {
          // For paid tickets, open Stripe in new tab
          window.open(data.url, '_blank');
        }
        setGuestEmailDialogOpen(false);
        setGuestEmail("");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Erreur lors de la création de la commande");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleGuestCheckout = () => {
    if (!guestEmail || !guestEmail.includes('@')) {
      toast.error("Veuillez entrer un email valide");
      return;
    }
    processCheckout(guestEmail);
  };

  return (
    <div className="min-h-screen">
      <div className="relative h-64 md:h-96 overflow-hidden">
        {event.banner_url ? (
          <img 
            src={event.banner_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <Calendar className="h-24 w-24 text-primary-foreground opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto max-w-4xl px-3 md:px-4 -mt-20 md:-mt-32 relative z-10">
        <Button 
          variant="ghost" 
          className="mb-4 md:mb-6 bg-background/80 backdrop-blur-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="p-4 md:p-8 space-y-4 md:space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                {event.subtitle && (
                  <p className="text-xl text-muted-foreground">{event.subtitle}</p>
                )}
              </div>
              <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
                {event.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{format(new Date(event.starts_at), "d MMMM yyyy", { locale: fr })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>
                  {format(new Date(event.starts_at), "HH:mm", { locale: fr })} - {format(new Date(event.ends_at), "HH:mm", { locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{event.venue}, {event.city}</span>
              </div>
              {event.capacity && (
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{event.capacity} places</span>
                </div>
              )}
            </div>
          </div>

          {event.description && (
            <div className="pt-6 border-t">
              <h2 className="text-2xl font-bold mb-4">À propos</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {priceTiers.length > 0 && (
            <div className="pt-6 border-t">
              <h2 className="text-2xl font-bold mb-4">Billets</h2>
              <div className="grid gap-4">
                {priceTiers.map((tier) => (
                  <Card key={tier.id} className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{tier.name}</h3>
                        {tier.quota && (
                          <p className="text-sm text-muted-foreground">{tier.quota} places disponibles</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-xl font-bold">
                          {(tier.price_cents / 100).toFixed(2)} €
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(tier.id, -1)}
                            disabled={!quantities[tier.id]}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {quantities[tier.id] || 0}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(tier.id, 1)}
                            disabled={(quantities[tier.id] || 0) >= 10}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {totalTickets > 0 && (
                <Card className="p-4 mt-4 bg-primary/5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Total ({totalTickets} billet{totalTickets > 1 ? 's' : ''})</span>
                    <span className="text-2xl font-bold">{(totalAmount / 100).toFixed(2)} €</span>
                  </div>
                </Card>
              )}

              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={handleCheckout}
                disabled={totalTickets === 0 || checkoutLoading}
              >
                {checkoutLoading ? (
                  "Chargement..."
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {totalAmount === 0 ? 'Réserver gratuitement' : `Acheter (${(totalAmount / 100).toFixed(2)} €)`}
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Guest Email Dialog */}
      <Dialog open={guestEmailDialogOpen} onOpenChange={setGuestEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{totalAmount === 0 ? 'Finaliser votre réservation' : 'Finaliser votre commande'}</DialogTitle>
            <DialogDescription>
              Veuillez entrer votre email pour recevoir vos billets{totalAmount === 0 ? ' avec le code QR' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email *</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="votre@email.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuestCheckout()}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleGuestCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Chargement..." : "Continuer"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setGuestEmailDialogOpen(false)}
                disabled={checkoutLoading}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetails;
