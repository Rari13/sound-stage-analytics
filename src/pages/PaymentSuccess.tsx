import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Ticket, Calendar, MapPin, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface OrderWithDetails {
  id: string;
  short_code: string;
  amount_total_cents: number;
  status: string;
  created_at: string;
  events: {
    title: string;
    venue: string;
    city: string;
    starts_at: string;
    slug: string;
    banner_url: string | null;
  };
  tickets: Array<{
    id: string;
    qr_token: string;
    status: string;
  }>;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      navigate("/");
      return;
    }
    fetchOrder();
  }, [sessionId]);

  const fetchOrder = async () => {
    try {
      // Try first with stripe_checkout_session_id
      let { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          short_code,
          amount_total_cents,
          status,
          created_at,
          events(title, venue, city, starts_at, slug, banner_url),
          tickets(id, qr_token, status)
        `)
        .eq("stripe_checkout_session_id", sessionId)
        .single();

      // If not found, try with order id (for free reservations)
      if (error && error.code === 'PGRST116') {
        const response = await supabase
          .from("orders")
          .select(`
            id,
            short_code,
            amount_total_cents,
            status,
            created_at,
            events(title, venue, city, starts_at, slug, banner_url),
            tickets(id, qr_token, status)
          `)
          .eq("id", sessionId)
          .single();
        
        data = response.data;
        error = response.error;
      }

      if (error) throw error;

      if (data) {
        setOrder(data as any);
        if (data.status === "completed" || data.status === "paid") {
          toast({
            title: "Réservation confirmée !",
            description: "Vos billets ont été envoyés par email.",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer votre commande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Commande introuvable</h2>
          <p className="text-muted-foreground mb-6">
            Nous n'avons pas pu trouver votre commande. Veuillez vérifier votre email.
          </p>
          <Link to="/">
            <Button>Retour à l'accueil</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Success Header */}
        <Card className="p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Paiement confirmé !</h1>
          <p className="text-lg text-muted-foreground">
            Votre commande <span className="font-semibold">#{order.short_code}</span> a été validée
          </p>
        </Card>

        {/* Event Details */}
        {order.events.banner_url && (
          <img
            src={order.events.banner_url}
            alt={order.events.title}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}
        
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">{order.events.title}</h2>
          <div className="space-y-3 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>
                {new Date(order.events.starts_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{order.events.venue}, {order.events.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              <span>{order.tickets?.length || 0} billet(s)</span>
            </div>
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Récapitulatif</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant total</span>
              <span className="font-semibold">
                {(order.amount_total_cents / 100).toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Statut</span>
              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {order.status === "completed" ? "Payé" : "En attente"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Code de commande</span>
              <span className="font-mono font-semibold">{order.short_code}</span>
            </div>
          </div>
        </Card>

        {/* Email Confirmation */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Email de confirmation envoyé
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Vos billets avec QR codes ont été envoyés à{" "}
                <span className="font-semibold">{user?.email}</span>. 
                Présentez-les à l'entrée de l'événement.
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/client/tickets" className="flex-1">
            <Button variant="default" className="w-full" size="lg">
              <Ticket className="mr-2 h-5 w-5" />
              Voir mes billets
            </Button>
          </Link>
          <Link to="/events/browse" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              Découvrir d'autres événements
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
