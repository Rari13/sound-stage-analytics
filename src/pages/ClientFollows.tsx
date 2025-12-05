import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserMinus, ArrowLeft, Heart, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FollowWithOrganizer {
  id: string;
  organizer: {
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    avatar_url: string | null;
  };
}

interface LikedEvent {
  id: string;
  event_id: string;
  event: {
    id: string;
    title: string;
    slug: string;
    banner_url: string | null;
    starts_at: string;
    city: string;
    venue: string;
  };
}

const ClientFollows = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [follows, setFollows] = useState<FollowWithOrganizer[]>([]);
  const [likedEvents, setLikedEvents] = useState<LikedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollows();
      fetchLikedEvents();
    }
  }, [user]);

  const fetchFollows = async () => {
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('id, organizer_id')
      .eq('user_id', user?.id);

    if (followsError || !followsData) {
      setLoading(false);
      return;
    }

    const organizerIds = followsData.map(f => f.organizer_id);

    if (organizerIds.length === 0) {
      setFollows([]);
      setLoading(false);
      return;
    }

    const { data: organizersData, error: organizersError } = await supabase
      .from('public_organizers_view')
      .select('id, name, slug, bio, avatar_url')
      .in('id', organizerIds);

    if (organizersError || !organizersData) {
      setLoading(false);
      return;
    }

    const combined = followsData.map(follow => ({
      id: follow.id,
      organizer: organizersData.find(org => org.id === follow.organizer_id)!
    })).filter(f => f.organizer);

    setFollows(combined as any);
    setLoading(false);
  };

  const fetchLikedEvents = async () => {
    // Get liked swipes (direction = 'right')
    const { data: swipesData, error: swipesError } = await supabase
      .from('swipes')
      .select('id, event_id')
      .eq('user_id', user?.id)
      .eq('direction', 'right');

    if (swipesError || !swipesData) {
      setLoadingEvents(false);
      return;
    }

    const eventIds = swipesData.map(s => s.event_id);

    if (eventIds.length === 0) {
      setLikedEvents([]);
      setLoadingEvents(false);
      return;
    }

    // Fetch event details
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, title, slug, banner_url, starts_at, city, venue')
      .in('id', eventIds)
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    if (eventsError || !eventsData) {
      setLoadingEvents(false);
      return;
    }

    const combined = swipesData
      .map(swipe => ({
        id: swipe.id,
        event_id: swipe.event_id,
        event: eventsData.find(e => e.id === swipe.event_id)!
      }))
      .filter(s => s.event);

    setLikedEvents(combined);
    setLoadingEvents(false);
  };

  const handleUnfollow = async (followId: string, organizerName: string) => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('id', followId);

    if (!error) {
      setFollows(follows.filter(f => f.id !== followId));
      toast({
        title: "Désabonné",
        description: `Vous ne suivez plus ${organizerName}`,
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de se désabonner",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Événements likés
            </TabsTrigger>
            <TabsTrigger value="organizers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Organisateurs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            {loadingEvents ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : likedEvents.length === 0 ? (
              <Card className="p-12 text-center">
                <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">Aucun événement liké</p>
                <p className="text-muted-foreground mb-6">
                  Swipez à droite sur les événements qui vous plaisent dans Découvrir
                </p>
                <Link to="/client/discover">
                  <Button>Découvrir des événements</Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {likedEvents.map((liked) => (
                  <Link key={liked.id} to={`/events/${liked.event.slug}`}>
                    <Card className="p-4 hover:bg-accent/5 transition-colors">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {liked.event.banner_url ? (
                            <img 
                              src={liked.event.banner_url} 
                              alt={liked.event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-accent flex items-center justify-center">
                              <Calendar className="h-8 w-8 text-accent-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{liked.event.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(liked.event.starts_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4" />
                            {liked.event.venue}, {liked.event.city}
                          </div>
                        </div>
                        <Heart className="h-5 w-5 text-red-500 fill-red-500 flex-shrink-0" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="organizers" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : follows.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">Aucun organisateur suivi</p>
                <p className="text-muted-foreground mb-6">
                  Suivez vos organisateurs préférés pour ne rien manquer
                </p>
                <Link to="/events/browse">
                  <Button>Découvrir des événements</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {follows.map((follow) => (
                  <Card key={follow.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-xl bg-gradient-accent flex items-center justify-center flex-shrink-0">
                        {follow.organizer.avatar_url ? (
                          <img 
                            src={follow.organizer.avatar_url} 
                            alt={follow.organizer.name}
                            className="h-full w-full object-cover rounded-xl"
                          />
                        ) : (
                          <Users className="h-8 w-8 text-accent-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate">{follow.organizer.name}</h3>
                        <p className="text-sm text-muted-foreground">@{follow.organizer.slug}</p>
                        {follow.organizer.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {follow.organizer.bio}
                          </p>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Link to={`/@${follow.organizer.slug}`}>
                            <Button variant="outline" size="sm">
                              Voir la page
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnfollow(follow.id, follow.organizer.name)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Ne plus suivre
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientFollows;
