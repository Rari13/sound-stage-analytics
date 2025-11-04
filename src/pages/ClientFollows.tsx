import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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

const ClientFollows = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [follows, setFollows] = useState<FollowWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollows();
    }
  }, [user]);

  const fetchFollows = async () => {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        id,
        organizer:organizers(id, name, slug, bio, avatar_url)
      `)
      .eq('user_id', user?.id);

    if (!error && data) {
      setFollows(data as any);
    }
    setLoading(false);
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Organisateurs suivis</h1>
          <Link to="/events/browse">
            <Button>Découvrir des événements</Button>
          </Link>
        </div>

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
      </div>
    </div>
  );
};

export default ClientFollows;
