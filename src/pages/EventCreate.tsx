import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BannerUpload } from "@/components/BannerUpload";
import { Plus, Trash2, MapPin, Loader2 } from "lucide-react";

interface PriceTier {
  name: string;
  price_cents: number;
  quota: number | null;
  starts_at: string;
  ends_at: string;
}

const EventCreate = () => {
  const { user } = useAuth();
  const { isEmailConfirmed } = useEmailVerification();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    venue: "",
    city: "",
    address_line1: "",
    starts_at: "",
    ends_at: "",
    banner_url: null as string | null,
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([
    {
      name: "Tarif normal",
      price_cents: 1000,
      quota: null,
      starts_at: "",
      ends_at: "",
    }
  ]);

  useEffect(() => {
    const fetchOrganizer = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('organizers')
        .select('id')
        .eq('owner_user_id', user.id)
        .single();
      if (data) setOrganizerId(data.id);
    };
    fetchOrganizer();
  }, [user]);

  const handleGeolocateAddress = async () => {
    if (!formData.address_line1 || !formData.city) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner l'adresse et la ville",
        variant: "destructive",
      });
      return;
    }

    setGeolocating(true);

    try {
      const query = `${formData.address_line1}, ${formData.city}, France`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=fr`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const location = data[0];
        setFormData({
          ...formData,
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
        });

        toast({
          title: "Localisation trouvée",
          description: `Coordonnées: ${location.display_name}`,
        });
      } else {
        toast({
          title: "Localisation introuvable",
          description: "Vérifiez l'adresse saisie",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de géolocaliser l'adresse",
        variant: "destructive",
      });
    }

    setGeolocating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);

    // Get organizer
    const { data: orgData } = await supabase
      .from('organizers')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    if (!orgData) {
      toast({
        title: "Erreur",
        description: "Profil organisateur introuvable",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Generate slug
    const baseSlug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data: eventData, error } = await supabase
      .from('events')
      .insert({
        organizer_id: orgData.id,
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        venue: formData.venue,
        city: formData.city,
        address_line1: formData.address_line1,
        latitude: formData.latitude,
        longitude: formData.longitude,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at || new Date(new Date(formData.starts_at).getTime() + 6 * 60 * 60 * 1000).toISOString(),
        slug: baseSlug + '-' + Date.now(),
        status: 'draft',
        banner_url: formData.banner_url,
      } as any)
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Insert price tiers
    if (eventData && priceTiers.length > 0) {
      const { error: tiersError } = await supabase
        .from('price_tiers')
        .insert(
          priceTiers.map(tier => ({
            event_id: eventData.id,
            name: tier.name,
            price_cents: tier.price_cents,
            quota: tier.quota,
            starts_at: tier.starts_at || formData.starts_at,
            ends_at: tier.ends_at || formData.ends_at || new Date(new Date(formData.starts_at).getTime() + 6 * 60 * 60 * 1000).toISOString(),
          }))
        );

      if (tiersError) {
        console.error("Error creating price tiers:", tiersError);
      }
    }

    toast({
      title: "Événement créé",
      description: "Vous pouvez maintenant le publier",
    });
    navigate("/orga/home");
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-3xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Créer un événement</h1>
            <p className="text-muted-foreground">Remplissez les informations de base</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/orga/home")}>
            ← Retour
          </Button>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label>Bannière de l'événement</Label>
              {organizerId && (
                <BannerUpload
                  value={formData.banner_url || undefined}
                  onChange={(url) => setFormData({ ...formData, banner_url: url })}
                  organizerId={organizerId}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'événement *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Concert de jazz"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Sous-titre</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Une soirée exceptionnelle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                placeholder="Décrivez votre événement..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venue">Lieu *</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  required
                  placeholder="Salle de concert"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  placeholder="Paris"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse complète *</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  required
                  placeholder="64 Rue Jeanne d'Arc"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeolocateAddress}
                  disabled={geolocating || !formData.address_line1 || !formData.city}
                >
                  {geolocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {formData.latitude && formData.longitude
                  ? `✓ Position enregistrée (${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)})`
                  : "Cliquez sur l'icône pour géolocaliser l'adresse"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Début *</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ends_at">Fin (optionnel)</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Si vide, +6h par défaut</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-lg">Tarifs et billetterie</Label>
                  <p className="text-sm text-muted-foreground">Configurez vos différents tarifs</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPriceTiers([...priceTiers, {
                    name: `Tarif ${priceTiers.length + 1}`,
                    price_cents: 1000,
                    quota: null,
                    starts_at: "",
                    ends_at: "",
                  }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un tarif
                </Button>
              </div>

              {priceTiers.map((tier, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Tarif {index + 1}</h4>
                      {priceTiers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPriceTiers(priceTiers.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nom du tarif</Label>
                        <Input
                          value={tier.name}
                          onChange={(e) => {
                            const newTiers = [...priceTiers];
                            newTiers[index].name = e.target.value;
                            setPriceTiers(newTiers);
                          }}
                          placeholder="Early Bird"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tier.price_cents / 100}
                          onChange={(e) => {
                            const newTiers = [...priceTiers];
                            newTiers[index].price_cents = Math.round(parseFloat(e.target.value) * 100);
                            setPriceTiers(newTiers);
                          }}
                          placeholder="10.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock (optionnel)</Label>
                        <Input
                          type="number"
                          value={tier.quota || ""}
                          onChange={(e) => {
                            const newTiers = [...priceTiers];
                            newTiers[index].quota = e.target.value ? parseInt(e.target.value) : null;
                            setPriceTiers(newTiers);
                          }}
                          placeholder="100"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button type="submit" disabled={loading} className="w-full" variant="hero" size="lg">
              {loading ? "Création..." : "Créer l'événement"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EventCreate;
