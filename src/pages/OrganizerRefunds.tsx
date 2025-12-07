import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Check, X, Calendar, User, MessageSquare, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface RefundRequestWithDetails {
  id: string;
  ticket_id: string;
  order_id: string;
  event_id: string;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  response_message: string | null;
  event: {
    id: string;
    title: string;
    starts_at: string;
  };
  order: {
    amount_total_cents: number;
    currency: string;
  };
}

const OrganizerRefunds = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RefundRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  
  // Response dialog state
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequestWithDetails | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseAction, setResponseAction] = useState<'approved' | 'rejected'>('approved');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrganizer();
    }
  }, [user]);

  useEffect(() => {
    if (organizerId) {
      fetchRequests();
    }
  }, [organizerId]);

  const fetchOrganizer = async () => {
    const { data } = await supabase
      .from('organizers')
      .select('id')
      .eq('owner_user_id', user?.id)
      .single();
    
    if (data) {
      setOrganizerId(data.id);
    }
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        id,
        ticket_id,
        order_id,
        event_id,
        user_id,
        reason,
        status,
        created_at,
        response_message,
        event:events(id, title, starts_at),
        order:orders(amount_total_cents, currency)
      `)
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const openResponseDialog = (request: RefundRequestWithDetails, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setResponseAction(action);
    setResponseMessage("");
    setResponseDialogOpen(true);
  };

  const submitResponse = async () => {
    if (!selectedRequest) return;
    
    setSubmitting(true);
    
    const { error } = await supabase
      .from('refund_requests')
      .update({
        status: responseAction,
        response_message: responseMessage.trim() || null,
        responded_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    setSubmitting(false);
    
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    } else {
      toast.success(responseAction === 'approved' ? "Remboursement approuvé" : "Demande refusée");
      setResponseDialogOpen(false);
      fetchRequests();
    }
  };

  const formatPrice = (cents: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen p-3 md:p-8 pb-24">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/orga/home')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <RotateCcw className="h-6 w-6" />
              Demandes de remboursement
            </h1>
            {pendingCount > 0 && (
              <p className="text-muted-foreground mt-1">
                {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center">
            <RotateCcw className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">Aucune demande</p>
            <p className="text-muted-foreground">
              Vous n'avez pas encore reçu de demandes de remboursement
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className={`p-4 md:p-6 ${request.status === 'pending' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{request.event?.title || 'Événement'}</h3>
                        <Badge variant={
                          request.status === 'pending' ? 'secondary' :
                          request.status === 'approved' ? 'default' : 'destructive'
                        }>
                          {request.status === 'pending' ? 'En attente' :
                           request.status === 'approved' ? 'Approuvé' : 'Refusé'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(request.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{formatPrice(request.order?.amount_total_cents || 0, request.order?.currency)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">Raison de la demande:</p>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                      </div>
                    </div>
                  </div>

                  {request.response_message && (
                    <div className={`p-3 rounded-lg text-sm ${
                      request.status === 'approved' 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      <p className="font-medium mb-1">Votre réponse:</p>
                      <p>{request.response_message}</p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => openResponseDialog(request, 'approved')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openResponseDialog(request, 'rejected')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Response Dialog */}
        <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {responseAction === 'approved' ? (
                  <>
                    <Check className="h-5 w-5 text-green-600" />
                    Approuver le remboursement
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-red-600" />
                    Refuser la demande
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {responseAction === 'approved' 
                  ? "Le client sera notifié que son remboursement a été approuvé."
                  : "Expliquez au client pourquoi sa demande a été refusée."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Message au client {responseAction === 'rejected' && <span className="text-destructive">*</span>}
                </label>
                <Textarea
                  placeholder={responseAction === 'approved' 
                    ? "Message optionnel pour le client..."
                    : "Expliquez pourquoi vous refusez cette demande..."}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {responseAction === 'approved' && (
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Approuver cette demande ne déclenche pas automatiquement le remboursement Stripe. 
                    Vous devrez effectuer le remboursement manuellement depuis votre dashboard Stripe.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={submitResponse}
                disabled={submitting || (responseAction === 'rejected' && !responseMessage.trim())}
                variant={responseAction === 'approved' ? 'default' : 'destructive'}
              >
                {submitting ? "Envoi..." : "Confirmer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OrganizerRefunds;