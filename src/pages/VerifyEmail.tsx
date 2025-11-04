import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VerifyEmail = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSent(true);
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte de réception",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-strong">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-accent-glow">
              {sent ? (
                <CheckCircle2 className="h-8 w-8 text-accent-foreground" />
              ) : (
                <Mail className="h-8 w-8 text-accent-foreground" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold">Vérifiez votre email</h1>
          <p className="text-muted-foreground">
            Un email de confirmation a été envoyé à <strong>{user?.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Cliquez sur le lien dans l'email pour activer votre compte et accéder à toutes les fonctionnalités.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleResend} 
            disabled={loading || sent}
            className="w-full" 
            variant="hero"
            size="lg"
          >
            {loading ? "Envoi..." : sent ? "Email envoyé ✓" : "Renvoyer l'email"}
          </Button>

          <Link to="/">
            <Button variant="outline" className="w-full">
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          N'oubliez pas de vérifier vos spams si vous ne trouvez pas l'email.
        </p>
      </Card>
    </div>
  );
};

export default VerifyEmail;
