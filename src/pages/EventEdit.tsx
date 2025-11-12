import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BannerUpload } from "@/components/BannerUpload";

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
  const [organizerId, setOrganizerId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    venue: "",
    city: "",
    starts_at: "",
    ends_at: "",
    banner_url: "",
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
        starts_at: eventData.starts_at ? new Date(eventData.starts_at).toISOString().slice(0, 16) : "",
        ends_at: eventData.ends_at ? new Date(eventData.ends_at).toISOString().slice(0, 16) : "",
        banner_url: eventData.banner_url || "",
      });

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
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: new Date(formData.ends_at).toISOString(),
        banner_url: formData.banner_url,
      })
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

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

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/orga/home")}
              >
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EventEdit;
