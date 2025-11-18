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
import { Separator } from "@/components/ui/separator";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, signInWithApple, user, signOut } = useAuth();
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
    navigate('/login');
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAppleSignIn = async () => {
    const { error } = await signInWithApple();
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
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
      <Card className="w-full max-w-md p-4 md:p-8 space-y-4 md:space-y-6 shadow-strong">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
              <Music className="h-7 w-7 md:h-8 md:w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Connexion</h1>
          <p className="text-sm md:text-base text-muted-foreground">
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continuer avec
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>
          <Button 
            variant="outline" 
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple
          </Button>
        </div>

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
