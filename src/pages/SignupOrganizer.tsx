import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Music } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { organizerSignupSchema } from "@/lib/validationSchemas";

const SignupOrganizer = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    organizerName: "",
    slug: "",
    phone: "",
    siret: "",
    termsAccepted: false,
    privacyAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with zod schema
    const result = organizerSignupSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join(".");
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      
      // Show first error as toast
      const firstError = result.error.errors[0];
      toast({
        title: "Erreur de validation",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // First, sign up the user
    const { error: signUpError } = await signUp(formData.email, formData.password, {
      role: 'organizer',
      terms_accepted: formData.termsAccepted,
      privacy_accepted: formData.privacyAccepted,
    });

    if (signUpError) {
      toast({
        title: "Erreur d'inscription",
        description: signUpError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // user_roles entry is automatically created by the handle_new_user() trigger
    // Now create the organizer profile
    const { data: userData } = await supabase.auth.getUser();
    
    if (userData.user) {
      const { error: orgError } = await supabase
        .from('organizers')
        .insert({
          owner_user_id: userData.user.id,
          name: formData.organizerName.trim(),
          slug: formData.slug.trim().toLowerCase(),
          phone: formData.phone?.trim() || null,
          siret: formData.siret?.trim() || null,
        });

      if (orgError) {
        toast({
          title: "Erreur",
          description: "Impossible de créer le profil organisateur",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    toast({
      title: "Compte créé avec succès",
      description: "Vous êtes maintenant connecté !",
    });
    navigate("/orga/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-2xl p-8 space-y-6 shadow-strong">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-accent-glow">
              <Music className="h-8 w-8 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Inscription Organisateur</h1>
          <p className="text-muted-foreground">
            Créez votre compte pour organiser des événements
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizerName">Nom de l'organisation</Label>
            <Input
              id="organizerName"
              placeholder="Mon Organisation"
              value={formData.organizerName}
              onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
              required
              maxLength={100}
              className={`h-11 ${errors.organizerName ? 'border-destructive' : ''}`}
            />
            {errors.organizerName && (
              <p className="text-xs text-destructive">{errors.organizerName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Identifiant unique (slug)</Label>
              <Input
                id="slug"
                placeholder="mon-organisation"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                required
                maxLength={50}
                className={`h-11 ${errors.slug ? 'border-destructive' : ''}`}
              />
              <p className="text-xs text-muted-foreground">
                Votre URL : sparkevents.app/@{formData.slug || "votre-slug"}
              </p>
              {errors.slug && (
                <p className="text-xs text-destructive">{errors.slug}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={20}
                className={`h-11 ${errors.phone ? 'border-destructive' : ''}`}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siret">SIRET (optionnel)</Label>
            <Input
              id="siret"
              placeholder="123 456 789 00012"
              value={formData.siret}
              onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
              maxLength={17}
              className={`h-11 ${errors.siret ? 'border-destructive' : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              Vous pourrez l'ajouter plus tard
            </p>
            {errors.siret && (
              <p className="text-xs text-destructive">{errors.siret}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email professionnel</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@organisation.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              maxLength={255}
              className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                maxLength={72}
                className={`h-11 ${errors.password ? 'border-destructive' : ''}`}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                maxLength={72}
                className={`h-11 ${errors.confirmPassword ? 'border-destructive' : ''}`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, termsAccepted: checked as boolean })
                }
                required
              />
              <label
                htmlFor="terms"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                J'accepte les{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Conditions Générales d'Utilisation
                </Link>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy"
                checked={formData.privacyAccepted}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, privacyAccepted: checked as boolean })
                }
                required
              />
              <label
                htmlFor="privacy"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                J'accepte la{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Politique de Confidentialité
                </Link>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            variant="accent"
            className="w-full"
            size="lg"
            disabled={!formData.termsAccepted || !formData.privacyAccepted || loading}
          >
            {loading ? "Création..." : "Créer mon compte organisateur"}
          </Button>
        </form>

        <div className="text-center text-sm space-y-2">
          <p className="text-muted-foreground">Vous avez déjà un compte ?</p>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              Se connecter
            </Button>
          </Link>
        </div>

        <div className="text-center">
          <Link to="/">
            <Button variant="ghost" size="sm">
              ← Retour à l'accueil
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignupOrganizer;
