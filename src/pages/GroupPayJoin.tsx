import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, MapPin, Check, Clock, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface GroupOrder {
  id: string;
  event_id: string;
  creator_user_id: string;
  total_tickets: number;
  price_per_ticket_cents: number;
  share_code: string;
  status: string;
  expires_at: string;
  events: {
    title: string;
    subtitle: string;
    banner_url: string;
    venue: string;
    city: string;
    starts_at: string;
  };
}

interface Participant {
  id: string;
  email: string;
  amount_cents: number;
  status: string;
  user_id: string | null;
  paid_at: string | null;
}

export default function GroupPayJoin() {
  const { shareCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const success = searchParams.get("success") === "true";

  useEffect(() => {
    if (shareCode) {
      fetchGroupOrder();
    }
  }, [shareCode]);

  useEffect(() => {
    if (success) {
      toast.success("Paiement réussi !", { description: "Votre part a été payée." });
      fetchGroupOrder(); // Refresh to show updated status
    }
  }, [success]);

  const fetchGroupOrder = async () => {
    setLoading(true);
    
    try {
      // Use secure edge function to fetch group order data
      const { data, error } = await supabase.functions.invoke("get-group-order", {
        body: { shareCode },
      });

      if (error || !data?.groupOrder) {
        toast.error("Groupe non trouvé");
        navigate("/");
        return;
      }

      setGroupOrder(data.groupOrder as any);
      setParticipants(data.participants || []);
    } catch (err) {
      console.error("Error fetching group order:", err);
      toast.error("Erreur lors du chargement");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handlePayMyShare = async () => {
    if (!user) {
      toast.error("Connectez-vous pour payer");
      navigate(`/login?redirect=/group-pay/${shareCode}`);
      return;
    }

    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("pay-group-share", {
        body: { shareCode },
      });

      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de paiement");
      setPaying(false);
    }
  };

  const paidCount = participants.filter(p => p.status === "paid").length;
  const myParticipant = participants.find(p => (p as any).originalEmail?.toLowerCase() === user?.email?.toLowerCase() || p.user_id === user?.id);
  const isExpired = groupOrder && new Date(groupOrder.expires_at) < new Date();
  const isComplete = groupOrder?.status === "complete" || paidCount === participants.length;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-48 w-full rounded-3xl mb-6" />
        <Skeleton className="h-32 w-full rounded-2xl mb-4" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!groupOrder) return null;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Event Banner */}
      <div className="h-48 w-full relative">
        <img 
          src={groupOrder.events?.banner_url || "/placeholder.svg"} 
          className="w-full h-full object-cover" 
          alt={groupOrder.events?.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="px-6 -mt-12 relative z-10">
        {/* Event Info */}
        <div className="mb-6">
          <Badge variant="secondary" className="mb-2">
            <Users className="h-3 w-3 mr-1" />
            Group Pay
          </Badge>
          <h1 className="text-3xl font-black text-foreground leading-tight">
            {groupOrder.events?.title}
          </h1>
          <p className="text-muted-foreground font-medium">{groupOrder.events?.subtitle}</p>
        </div>

        {/* Event Details */}
        <div className="flex gap-4 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(groupOrder.events?.starts_at), "d MMM • HH:mm", { locale: fr })}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {groupOrder.events?.city}
          </div>
        </div>

        {/* Status Banner */}
        {isExpired && (
          <Card className="p-4 mb-6 bg-destructive/10 border-destructive/20">
            <p className="text-destructive font-medium text-center">
              Ce groupe a expiré
            </p>
          </Card>
        )}

        {isComplete && !isExpired && (
          <Card className="p-4 mb-6 bg-green-500/10 border-green-500/20">
            <p className="text-green-600 font-medium text-center flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              Groupe complet ! Tous ont payé.
            </p>
          </Card>
        )}

        {/* Progress */}
        <Card className="p-6 mb-6 border-border">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-lg">Progression</span>
            <span className="text-2xl font-black text-primary">
              {paidCount}/{participants.length}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(paidCount / participants.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {(groupOrder.price_per_ticket_cents / 100).toFixed(2)} € par personne
          </p>
        </Card>

        {/* Participants List */}
        <div className="space-y-3 mb-6">
          <h3 className="font-bold text-lg">Participants</h3>
          {participants.map((p) => (
            <Card 
              key={p.id} 
              className={`p-4 flex justify-between items-center transition-all ${
                p.status === "paid" ? "bg-green-500/5 border-green-500/20" : "border-border"
              }`}
            >
              <div>
                <p className="font-medium text-foreground">
                  {p.email}
                  {((p as any).originalEmail?.toLowerCase() === user?.email?.toLowerCase() || p.user_id === user?.id) && (
                    <span className="text-primary ml-2">(vous)</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(p.amount_cents / 100).toFixed(2)} €
                </p>
              </div>
              {p.status === "paid" ? (
                <Badge className="bg-green-500 text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Payé
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  En attente
                </Badge>
              )}
            </Card>
          ))}
        </div>

        {/* Expiration */}
        {!isExpired && !isComplete && (
          <p className="text-sm text-muted-foreground text-center mb-6">
            Expire le {format(new Date(groupOrder.expires_at), "d MMM à HH:mm", { locale: fr })}
          </p>
        )}
      </div>

      {/* Action Button */}
      {!isExpired && myParticipant?.status !== "paid" && !isComplete && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border safe-bottom z-40">
          <div className="max-w-md mx-auto">
            <Button 
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-xl active:scale-95 transition-all"
              onClick={handlePayMyShare}
              disabled={paying}
            >
              {paying ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : null}
              Payer ma part • {(groupOrder.price_per_ticket_cents / 100).toFixed(2)} €
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
