import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

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
                    <Button variant="outline" size="sm">
                      Afficher le QR Code
                    </Button>
                    <Link to={`/event/${ticket.event.id}`}>
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
      </div>
    </div>
  );
};

export default ClientTickets;
