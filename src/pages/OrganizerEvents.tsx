import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Edit, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
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

    fetchEvents();
  }, [user]);

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.starts_at) >= now);
  const pastEvents = events.filter((e) => new Date(e.starts_at) < now);

  const EventCard = ({ event }: { event: Event }) => (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/orga/events/edit/${event.id}`)}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm line-clamp-1">{event.title}</h3>
            <Badge
              variant={event.status === "published" ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {event.status === "published" ? "Publié" : "Brouillon"}
            </Badge>
          </div>

          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(event.starts_at), "EEE d MMM yyyy", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.venue}, {event.city}
            </p>
          </div>
        </div>

        {/* Edit Icon */}
        <Button variant="ghost" size="icon" className="shrink-0 self-center">
          <Edit className="h-4 w-4" />
        </Button>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes Événements</h1>
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

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingEvents.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun événement à venir</p>
              <Button
                className="mt-4"
                onClick={() => navigate("/orga/events/create")}
              >
                Créer mon premier événement
              </Button>
            </Card>
          ) : (
            upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {pastEvents.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucun événement passé</p>
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
