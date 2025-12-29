import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, DollarSign, AlertCircle, ShoppingCart, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TicketActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    is_for_sale?: boolean;
    event: {
      id: string;
      title: string;
      ends_at?: string;
      starts_at: string;
    };
  };
  onSuccess: () => void;
}

export function TicketActionModal({ open, onOpenChange, ticket, onSuccess }: TicketActionModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Utiliser ends_at si disponible, sinon starts_at + 6h comme estimation
  const eventEndDate = ticket.event.ends_at 
    ? new Date(ticket.event.ends_at) 
    : new Date(new Date(ticket.event.starts_at).getTime() + 6 * 60 * 60 * 1000);
  const isEventFinished = new Date() > eventEndDate;
  const isForSale = ticket.is_for_sale || false;

  const handleAction = async (action: 'sell' | 'cancel_sell' | 'refund_request') => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('toggle-ticket-resale', {
        body: { ticketId: ticket.id, action }
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de l'opération");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(
        action === 'sell' ? "Billet en vente !" : 
        action === 'cancel_sell' ? "Vente annulée" : 
        "Demande envoyée",
        { description: data?.message }
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer mon billet</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{ticket.event.title}</span>
            <span className="text-muted-foreground">•</span>
            <span>Fin le {format(eventEndDate, "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!isEventFinished ? (
            // CAS 1 : ÉVÉNEMENT EN COURS -> REVENTE
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-full bg-primary/10">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Revendre mon billet</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'événement n'étant pas terminé, le remboursement n'est pas disponible. 
                    Vous pouvez mettre votre billet en vente sur la marketplace sécurisée.
                  </p>
                </div>
              </div>

              {isForSale && (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Votre billet est actuellement en vente
                </Badge>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Le prix de revente est plafonné au prix d'achat pour éviter le scalping.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // CAS 2 : ÉVÉNEMENT TERMINÉ -> REMBOURSEMENT
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-full bg-destructive/10">
                  <RefreshCw className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Demander un remboursement</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'événement est clôturé. Si vous n'avez pas pu y assister pour une raison valable, 
                    vous pouvez soumettre une réclamation à l'organisateur.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    L'organisateur a le droit d'accepter ou de refuser votre demande selon ses conditions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          
          {!isEventFinished ? (
            isForSale ? (
              <Button 
                variant="secondary"
                onClick={() => handleAction('cancel_sell')}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" />
                Retirer de la vente
              </Button>
            ) : (
              <Button 
                onClick={() => handleAction('sell')}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ShoppingCart className="mr-2 h-4 w-4" />
                Mettre en vente
              </Button>
            )
          ) : (
            <Button 
              variant="destructive"
              onClick={() => handleAction('refund_request')}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer la demande
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
