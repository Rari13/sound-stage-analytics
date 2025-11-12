import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, user, signOut } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Email verification disabled for now

    // Get user role and redirect
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    toast({
      title: "Connexion réussie",
      description: "Bienvenue !",
    });

    if (roleData?.role === 'client') {
      navigate("/client/home");
    } else if (roleData?.role === 'organizer') {
      navigate("/orga/home");
    } else {
      navigate("/");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Déconnecté", description: "Vous pouvez maintenant vous reconnecter." });
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6 shadow-strong">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Déjà connecté</h1>
            <p className="text-muted-foreground">Vous êtes déjà connecté. Vous pouvez aller à l’accueil ou vous déconnecter pour changer de compte.</p>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => navigate('/')}>Aller à l’accueil</Button>
            <Button variant="outline" className="flex-1" onClick={handleSignOut}>Se déconnecter</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-strong">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
              <Music className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Connexion</h1>
          <p className="text-muted-foreground">
            Accédez à votre compte Sound
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="space-y-4 text-center text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline block">
            Mot de passe oublié ?
          </Link>
          
          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-muted-foreground">Vous n'avez pas de compte ?</p>
            <div className="flex flex-col gap-2">
              <Link to="/signup-client">
                <Button variant="outline" className="w-full">
                  Inscription Client
                </Button>
              </Link>
              <Link to="/signup-organizer">
                <Button variant="outline" className="w-full">
                  Inscription Organisateur
                </Button>
              </Link>
            </div>
          </div>
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

export default Login;
