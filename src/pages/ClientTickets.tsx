import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Ticket, Calendar, MapPin, ArrowLeft, Download, RotateCcw, AlertCircle, CheckCircle, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { toast } from "sonner";
import { TicketActionModal } from "@/components/TicketActionModal";

interface TicketWithEvent {
  id: string;
  qr_token: string;
  status: string;
  issued_at: string;
  order_id: string;
  is_for_sale?: boolean;
  resale_price_cents?: number;
  original_price_cents?: number;
  event: {
    id: string;
    title: string;
    venue: string;
    city: string;
    starts_at: string;
    ends_at?: string;
    organizer_id: string;
  };
}

interface RefundRequest {
  id: string;
  ticket_id: string;
  status: string;
  reason: string;
  created_at: string;
  response_message: string | null;
}

const ClientTickets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithEvent | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  
  // Refund request state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [ticketForRefund, setTicketForRefund] = useState<TicketWithEvent | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  
  // Ticket action modal state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [ticketForAction, setTicketForAction] = useState<TicketWithEvent | null>(null);

  useEffect(() => {
    if (user) {
      fetchTickets();
      fetchRefundRequests();
    }
  }, [user]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        id,
        qr_token,
        status,
        issued_at,
        order_id,
        is_for_sale,
        resale_price_cents,
        original_price_cents,
        event:events(id, title, venue, city, starts_at, ends_at, organizer_id)
      `)
      .eq('user_id', user?.id)
      .order('issued_at', { ascending: false });

    if (!error && data) {
      setTickets(data as any);
    }
    setLoading(false);
  };

  const fetchRefundRequests = async () => {
    const { data } = await supabase
      .from('refund_requests')
      .select('id, ticket_id, status, reason, created_at, response_message')
      .eq('user_id', user?.id);
    
    if (data) {
      setRefundRequests(data);
    }
  };

  const getRefundStatus = (ticketId: string) => {
    return refundRequests.find(r => r.ticket_id === ticketId);
  };

  const handleShowQR = async (ticket: TicketWithEvent) => {
    setSelectedTicket(ticket);
    try {
      const qrUrl = await QRCode.toDataURL(ticket.qr_token, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2,
      });
      setQrDataUrl(qrUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const downloadQRCode = () => {
    if (!qrDataUrl || !selectedTicket) return;
    
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `ticket-${selectedTicket.qr_token}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openRefundDialog = (ticket: TicketWithEvent) => {
    setTicketForRefund(ticket);
    setRefundReason("");
    setRefundDialogOpen(true);
  };

  const submitRefundRequest = async () => {
    if (!ticketForRefund || !refundReason.trim() || !user) return;
    
    setSubmittingRefund(true);
    
    const { error } = await supabase
      .from('refund_requests')
      .insert({
        ticket_id: ticketForRefund.id,
        order_id: ticketForRefund.order_id,
        event_id: ticketForRefund.event.id,
        user_id: user.id,
        organizer_id: ticketForRefund.event.organizer_id,
        reason: refundReason.trim()
      });

    setSubmittingRefund(false);
    
    if (error) {
      toast.error("Erreur lors de l'envoi de la demande");
      console.error(error);
    } else {
      toast.success("Demande de remboursement envoyée");
      setRefundDialogOpen(false);
      fetchRefundRequests();
    }
  };

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">En attente</span>;
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Approuvé</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Refusé</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-8">
      <div className="container mx-auto max-w-4xl space-y-6 md:space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
          <h1 className="text-2xl md:text-4xl font-bold">Mes billets</h1>
          <Link to="/events/browse">
            <Button className="w-full md:w-auto">Découvrir des événements</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : tickets.length === 0 ? (
          <Card className="p-12 text-center">
            <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">Aucun billet</p>
            <p className="text-muted-foreground mb-6">
              Vous n'avez pas encore acheté de billets
            </p>
            <Link to="/events/browse">
              <Button>Découvrir des événements</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const refundStatus = getRefundStatus(ticket.id);
              
              return (
                <Card key={ticket.id} className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold">{ticket.event.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(ticket.event.starts_at).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4" />
                          <span>{ticket.event.venue}, {ticket.event.city}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ticket.status === 'valid' ? 'bg-green-100 text-green-700' :
                          ticket.status === 'used' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {ticket.status === 'valid' ? 'Valide' :
                           ticket.status === 'used' ? 'Utilisé' : 'Invalide'}
                        </span>
                        {ticket.is_for_sale && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            En vente
                          </span>
                        )}
                        {refundStatus && getRefundStatusBadge(refundStatus.status)}
                      </div>
                      
                      {refundStatus && refundStatus.response_message && (
                        <div className={`p-3 rounded-lg text-sm ${
                          refundStatus.status === 'approved' 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          <p className="font-medium mb-1">Réponse de l'organisateur:</p>
                          <p>{refundStatus.response_message}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleShowQR(ticket)}
                        disabled={ticket.status !== 'valid'}
                      >
                        Afficher le QR Code
                      </Button>
                      <Link to={`/events/${ticket.event.id}`}>
                        <Button variant="ghost" size="sm" className="w-full">
                          Détails de l'événement
                        </Button>
                      </Link>
                      {ticket.status === 'valid' && !refundStatus && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            setTicketForAction(ticket);
                            setActionModalOpen(true);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Gérer / Revendre
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* QR Code Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Votre billet</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-lg mb-2">{selectedTicket.event.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {new Date(selectedTicket.event.starts_at).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {qrDataUrl && (
                  <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                    <img src={qrDataUrl} alt="QR Code" className="w-full max-w-xs" />
                  </div>
                )}

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Code du billet</p>
                  <p className="font-mono font-bold text-sm">{selectedTicket.qr_token}</p>
                </div>

                <Button 
                  onClick={downloadQRCode} 
                  className="w-full"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger le QR Code
                </Button>

                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-900 dark:text-amber-100">
                    <strong>Important:</strong> Présentez ce QR code à l'entrée de l'événement.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Refund Request Dialog */}
        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Demande de remboursement
              </DialogTitle>
              <DialogDescription>
                Expliquez la raison de votre demande de remboursement. L'organisateur examinera votre demande.
              </DialogDescription>
            </DialogHeader>
            
            {ticketForRefund && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium">{ticketForRefund.event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ticketForRefund.event.starts_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Raison de la demande</label>
                  <Textarea
                    placeholder="Expliquez pourquoi vous souhaitez être remboursé..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      L'organisateur a le droit d'accepter ou de refuser votre demande selon ses conditions de vente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={submitRefundRequest}
                disabled={!refundReason.trim() || submittingRefund}
              >
                {submittingRefund ? "Envoi..." : "Envoyer la demande"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket Action Modal (Resale/Refund) */}
        {ticketForAction && (
          <TicketActionModal
            open={actionModalOpen}
            onOpenChange={(open) => {
              setActionModalOpen(open);
              if (!open) setTicketForAction(null);
            }}
            ticket={ticketForAction}
            onSuccess={() => {
              fetchTickets();
              fetchRefundRequests();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ClientTickets;
