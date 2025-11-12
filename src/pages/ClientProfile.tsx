import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MUSIC_GENRES = [
  "Hip-Hop", "Rap", "R&B", "Pop", "Rock", "Électro", "Techno", "House",
  "Jazz", "Reggae", "Soul", "Funk", "Metal", "Indie", "Afrobeat", "Dancehall"
];

const ClientProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [city, setCity] = useState("");
  const [maxDistance, setMaxDistance] = useState(50);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('city, max_distance_km, preferred_genres')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!error && data) {
      const profileData = data as any;
      setCity(profileData.city || "");
      setMaxDistance(profileData.max_distance_km || 50);
      setSelectedGenres(profileData.preferred_genres || []);
    }
    setLoading(false);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('client_profiles')
      .update({
        city,
        max_distance_km: maxDistance,
        preferred_genres: selectedGenres
      } as any)
      .eq('user_id', user?.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les préférences",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Préférences sauvegardées",
        description: "Vos préférences ont été mises à jour",
      });
      navigate('/client/home');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-2xl space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div>
          <h1 className="text-4xl font-bold mb-2">Mes préférences</h1>
          <p className="text-muted-foreground">
            Personnalisez votre feed pour découvrir les événements qui vous correspondent
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Localisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                placeholder="Ex: Paris, Lyon, Marseille..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Nous vous suggérerons des événements dans cette ville et ses environs
              </p>
            </div>
            <div>
              <Label htmlFor="distance">
                Distance maximale: {maxDistance} km
              </Label>
              <input
                type="range"
                id="distance"
                min="10"
                max="200"
                step="10"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Genres musicaux préférés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {MUSIC_GENRES.map((genre) => (
                <Button
                  key={genre}
                  variant={selectedGenres.includes(genre) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {selectedGenres.length === 0
                ? "Sélectionnez vos genres préférés pour personnaliser votre feed"
                : `${selectedGenres.length} genre(s) sélectionné(s)`}
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? "Sauvegarde..." : "Sauvegarder mes préférences"}
        </Button>
      </div>
    </div>
  );
};

export default ClientProfile;
