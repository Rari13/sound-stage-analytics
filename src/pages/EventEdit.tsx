import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, MapPin, Loader2, Share2, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BannerUpload } from "@/components/BannerUpload";
import { buildEventShareUrl } from "@/lib/urlUtils";

interface PriceTier {
  id?: string;
  name: string;
  price_cents: number;
  quota: number | null;
  starts_at: string | null;
  ends_at: string | null;
}

const EventEdit = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [organizerId, setOrganizerId] = useState<string>("");
  const [eventSlug, setEventSlug] = useState<string>("");
  const [eventStatus, setEventStatus] = useState<string>("draft");
  
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    venue: "",
    city: "",
    address_line1: "",
    starts_at: "",
    ends_at: "",
    banner_url: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([
    { name: "", price_cents: 0, quota: null, starts_at: null, ends_at: null },
  ]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!user || !eventId) return;

      // Get organizer ID
      const { data: orgData } = await supabase
        .from('organizers')
        .select('id')
        .eq('owner_user_id', user.id)
        .single();

      if (!orgData) {
        toast({
          title: "Erreur",
          description: "Organizer non trouvé",
          variant: "destructive",
        });
        navigate("/orga/home");
        return;
      }

      setOrganizerId(orgData.id);

      // Get event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('organizer_id', orgData.id)
        .single();

      if (eventError || !eventData) {
        toast({
          title: "Erreur",
          description: "Événement non trouvé",
          variant: "destructive",
        });
        navigate("/orga/home");
        return;
      }

      setFormData({
        title: eventData.title || "",
        subtitle: eventData.subtitle || "",
        description: eventData.description || "",
        venue: eventData.venue || "",
        city: eventData.city || "",
        address_line1: eventData.address_line1 || "",
        starts_at: eventData.starts_at ? new Date(eventData.starts_at).toISOString().slice(0, 16) : "",
        ends_at: eventData.ends_at ? new Date(eventData.ends_at).toISOString().slice(0, 16) : "",
        banner_url: eventData.banner_url || "",
        latitude: (eventData as any).latitude || null,
        longitude: (eventData as any).longitude || null,
      });

      setEventSlug(eventData.slug || "");
      setEventStatus(eventData.status || "draft");

      // Get price tiers
      const { data: tiersData } = await supabase
        .from('price_tiers')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order');

      if (tiersData && tiersData.length > 0) {
        setPriceTiers(tiersData.map(tier => ({
          id: tier.id,
          name: tier.name,
          price_cents: tier.price_cents,
          quota: tier.quota,
          starts_at: tier.starts_at ? new Date(tier.starts_at).toISOString().slice(0, 16) : null,
          ends_at: tier.ends_at ? new Date(tier.ends_at).toISOString().slice(0, 16) : null,
        })));
      }

      setLoading(false);
    };

    fetchEventData();
  }, [user, eventId, navigate, toast]);

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
    if (!eventId) return;
    
    setSubmitting(true);

    // Update event
    const { error: eventError } = await supabase
      .from('events')
      .update({
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        venue: formData.venue,
        city: formData.city,
        address_line1: formData.address_line1,
        latitude: formData.latitude,
        longitude: formData.longitude,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: new Date(formData.ends_at).toISOString(),
        banner_url: formData.banner_url,
      } as any)
      .eq('id', eventId);

    if (eventError) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'événement",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Delete old price tiers
    await supabase
      .from('price_tiers')
      .delete()
      .eq('event_id', eventId);

    // Insert new price tiers
    const tiersToInsert = priceTiers.map((tier, index) => ({
      event_id: eventId,
      name: tier.name,
      price_cents: tier.price_cents,
      quota: tier.quota,
      starts_at: tier.starts_at ? new Date(tier.starts_at).toISOString() : null,
      ends_at: tier.ends_at ? new Date(tier.ends_at).toISOString() : null,
      sort_order: index,
    }));

    const { error: tiersError } = await supabase
      .from('price_tiers')
      .insert(tiersToInsert);

    if (tiersError) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les tarifs",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: "Événement mis à jour",
      description: "Les modifications ont été enregistrées",
    });

    navigate("/orga/home");
  };

  const handlePublish = async () => {
    if (!eventId) return;
    
    setPublishing(true);

    const { error } = await supabase
      .from('events')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de publier l'événement",
        variant: "destructive",
      });
      setPublishing(false);
      return;
    }

    setEventStatus('published');
    toast({
      title: "Événement publié !",
      description: "Votre événement est maintenant visible par tous",
    });
    setPublishing(false);
  };

  const addPriceTier = () => {
    setPriceTiers([...priceTiers, { name: "", price_cents: 0, quota: null, starts_at: null, ends_at: null }]);
  };

  const removePriceTier = (index: number) => {
    setPriceTiers(priceTiers.filter((_, i) => i !== index));
  };

  const updatePriceTier = (index: number, field: keyof PriceTier, value: any) => {
    const updated = [...priceTiers];
    updated[index] = { ...updated[index], [field]: value };
    setPriceTiers(updated);
  };

  const copyShareableLink = () => {
    const link = buildEventShareUrl(eventSlug);
    navigator.clipboard.writeText(link);
    toast({
      title: "Lien copié",
      description: "Le lien partageable a été copié dans le presse-papier",
    });
  };

  const shareEventLink = async () => {
    const link = buildEventShareUrl(eventSlug);

    const shareData = {
      title: formData.title || "Événement",
      text: formData.title ? `Achetez vos billets : ${formData.title}` : "Achetez vos billets",
      url: link,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // annulation utilisateur
      }
    }

    await navigator.clipboard.writeText(link);
    toast({
      title: "Lien copié",
      description: "Partagez ce lien : il ouvre la page client (achat de billets)",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  const shareableLink = buildEventShareUrl(eventSlug);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate("/orga/home")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        {eventSlug && (
          <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Share2 className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Lien partageable</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Partagez ce lien pour permettre aux utilisateurs de voir et d'acheter des billets sans télécharger l'app
                </p>
                <div className="flex gap-2">
                  <Input 
                    value={shareableLink} 
                    readOnly 
                    className="bg-background"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={copyShareableLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={shareEventLink}
                    title="Partager"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6">Modifier l'événement</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'événement *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Sous-titre</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
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
                <Label htmlFor="starts_at">Date et heure de début *</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ends_at">Date et heure de fin *</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bannière de l'événement</Label>
              <BannerUpload
                organizerId={organizerId}
                value={formData.banner_url}
                onChange={(url) => setFormData({ ...formData, banner_url: url || "" })}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Tarifs</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPriceTier}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un tarif
                </Button>
              </div>

              {priceTiers.map((tier, index) => (
                <Card key={index} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">Tarif {index + 1}</h3>
                    {priceTiers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePriceTier(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom du tarif *</Label>
                      <Input
                        value={tier.name}
                        onChange={(e) => updatePriceTier(index, 'name', e.target.value)}
                        placeholder="Ex: Early Bird"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Prix (€) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={tier.price_cents / 100}
                        onChange={(e) => updatePriceTier(index, 'price_cents', Math.round(parseFloat(e.target.value) * 100))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Stock (optionnel)</Label>
                      <Input
                        type="number"
                        value={tier.quota || ""}
                        onChange={(e) => updatePriceTier(index, 'quota', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Illimité"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Début de vente</Label>
                      <Input
                        type="datetime-local"
                        value={tier.starts_at || ""}
                        onChange={(e) => updatePriceTier(index, 'starts_at', e.target.value || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fin de vente</Label>
                      <Input
                        type="datetime-local"
                        value={tier.ends_at || ""}
                        onChange={(e) => updatePriceTier(index, 'ends_at', e.target.value || null)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/orga/home")}
              >
                Annuler
              </Button>
              
              {eventStatus === 'draft' && (
                <Button 
                  type="button"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  disabled={publishing}
                  onClick={handlePublish}
                >
                  {publishing ? "Publication..." : "🚀 Publier l'événement"}
                </Button>
              )}
              
              {eventStatus === 'published' && (
                <div className="text-center text-sm text-muted-foreground bg-green-500/10 p-3 rounded-lg">
                  ✓ Événement publié et visible par tous
                </div>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EventEdit;
