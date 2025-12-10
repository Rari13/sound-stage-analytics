import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Event {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  city: string;
  venue: string;
  status: string;
  banner_url: string | null;
}

export default function OrganizerEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!user) return;
    
    const { data: orgData } = await supabase
      .from("organizers")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!orgData) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("events")
      .select("id, title, slug, starts_at, city, venue, status, banner_url")
      .eq("organizer_id", orgData.id)
      .order("starts_at", { ascending: false });

    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleDelete = async (eventId: string, eventTitle: string) => {
    setDeleting(eventId);
    
    try {
      // Delete related data first
      await supabase.from("price_tiers").delete().eq("event_id", eventId);
      await supabase.from("scan_sessions").delete().eq("event_id", eventId);
      await supabase.from("scan_links").delete().eq("event_id", eventId);
      
      // Delete the event
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      
      if (error) throw error;
      
      toast.success(`"${eventTitle}" supprimé`);
      fetchEvents();
    } catch (error: any) {
      toast.error("Impossible de supprimer cet événement. Des billets ont peut-être été vendus.");
    } finally {
      setDeleting(null);
    }
  };

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.starts_at) >= now);
  const pastEvents = events.filter((e) => new Date(e.starts_at) < now);

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div 
          className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
          onClick={() => navigate(`/orga/events/edit/${event.id}`)}
        >
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/orga/events/edit/${event.id}`)}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm line-clamp-1">{event.title}</h3>
            <Badge
              variant={event.status === "published" ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {event.status === "published" ? "Publié" : "Brouillon"}
            </Badge>
          </div>

          <div className="mt-1.5 space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(event.starts_at), "EEE d MMM", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
              <MapPin className="h-3 w-3" />
              {event.venue}, {event.city}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => navigate(`/orga/events/edit/${event.id}`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={deleting === event.id}
              >
                {deleting === event.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. L'événement "{event.title}" et toutes ses données seront supprimés.
                  {event.status === "published" && (
                    <span className="block mt-2 text-destructive font-medium">
                      ⚠️ Cet événement est publié. La suppression peut affecter les participants.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(event.id, event.title)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mes Événements</h1>
        <Button onClick={() => navigate("/orga/events/create")} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Créer
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">
            À venir ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Passés ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-2">
          {upcomingEvents.length === 0 ? (
            <Card className="p-6 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Aucun événement à venir</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => navigate("/orga/events/create")}
              >
                Créer un événement
              </Button>
            </Card>
          ) : (
            upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-2">
          {pastEvents.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground text-sm">Aucun événement passé</p>
            </Card>
          ) : (
            pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
