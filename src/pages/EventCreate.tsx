import { useState } from "react";
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

const EventCreate = () => {
  const { user } = useAuth();
  const { isEmailConfirmed } = useEmailVerification();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    venue: "",
    city: "",
    starts_at: "",
    ends_at: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !isEmailConfirmed) {
      navigate("/verify-email");
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

    const { error } = await supabase
      .from('events')
      .insert({
        organizer_id: orgData.id,
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        venue: formData.venue,
        city: formData.city,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at || new Date(new Date(formData.starts_at).getTime() + 6 * 60 * 60 * 1000).toISOString(),
        slug: baseSlug + '-' + Date.now(),
        status: 'draft',
      });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Événement créé",
        description: "Vous pouvez maintenant le configurer",
      });
      navigate("/orga/home");
    }
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
          <form onSubmit={handleSubmit} className="space-y-6">
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
