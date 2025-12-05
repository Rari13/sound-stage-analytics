import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Music, Loader2, Home } from "lucide-react";
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
  const [geolocating, setGeolocating] = useState(false);
  
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
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
      .select('city, max_distance_km, preferred_genres, address')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!error && data) {
      const profileData = data as any;
      setCity(profileData.city || "");
      setAddress(profileData.address || "");
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

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive",
      });
      return;
    }

    setGeolocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`
          );
          const data = await response.json();
          
          const cityName = data.address.city || data.address.town || data.address.village || "";
          
          if (cityName) {
            setCity(cityName);
            
            await supabase
              .from('client_profiles')
              .update({
                latitude,
                longitude,
                city: cityName
              } as any)
              .eq('user_id', user?.id);
            
            toast({
              title: "Position détectée",
              description: `Votre ville : ${cityName}`,
            });
          }
        } catch (error) {
          toast({
            title: "Erreur",
            description: "Erreur lors de la récupération de l'adresse",
            variant: "destructive",
          });
        }
        
        setGeolocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Erreur",
          description: "Erreur lors de la récupération de votre position",
          variant: "destructive",
        });
        setGeolocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('client_profiles')
      .update({
        city,
        address,
        max_distance_km: maxDistance,
        preferred_genres: selectedGenres
      } as any)
      .eq('user_id', user?.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder. Vérifiez votre connexion.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profil mis à jour",
        description: "Vos préférences et votre adresse de sécurité sont enregistrées.",
      });
      navigate('/client/home');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24 md:p-8">
      <div className="container mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Mon Profil</h1>
        </div>

        {/* Section Sécurité */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Home className="h-5 w-5" />
              Retour en sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adresse de domicile</Label>
              <Input
                id="address"
                placeholder="10 Rue de la Paix, Paris"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Utilisée uniquement par le bouton "Rentrer à la maison" du Safety Widget.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section Localisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Zone de recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ville principale</Label>
              <div className="flex gap-2">
                <Input
                  id="city"
                  placeholder="Ex: Paris, Lyon, Marseille..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={geolocating}
                >
                  {geolocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between">
                <Label>Rayon de recherche</Label>
                <span className="text-sm font-bold">{maxDistance} km</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section Genres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Goûts musicaux
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
                  className="rounded-full"
                >
                  {genre}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-lg rounded-xl shadow-lg" size="lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
};

export default ClientProfile;
