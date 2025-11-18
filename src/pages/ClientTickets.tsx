import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ticket, Calendar, MapPin, ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";

interface TicketWithEvent {
  id: string;
  qr_token: string;
  status: string;
  issued_at: string;
  event: {
    id: string;
    title: string;
    venue: string;
    city: string;
    starts_at: string;
  };
}

const ClientTickets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithEvent | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchTickets();
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
        event:events(id, title, venue, city, starts_at)
      `)
      .eq('user_id', user?.id)
      .order('issued_at', { ascending: false });

    if (!error && data) {
      setTickets(data as any);
    }
    setLoading(false);
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
            {tickets.map((ticket) => (
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
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'valid' ? 'bg-green-100 text-green-700' :
                        ticket.status === 'used' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ticket.status === 'valid' ? 'Valide' :
                         ticket.status === 'used' ? 'Utilisé' : 'Invalide'}
                      </span>
                    </div>
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
                  </div>
                </div>
              </Card>
            ))}
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
      </div>
    </div>
  );
};

export default ClientTickets;
