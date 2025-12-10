import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Sparkles, Zap, TrendingUp, Crown, Loader2, Gift, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function OrganizerSubscription() {
  const { isPremium, trialActive, trialEnd, loading, startCheckout, openCustomerPortal, refreshSubscription } = useSubscription();
  const [processing, setProcessing] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Bienvenue dans Spark Pro ! Votre essai de 14 jours commence maintenant.");
      refreshSubscription();
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Paiement annulé");
    }
  }, [searchParams, refreshSubscription]);

  const handleUpgrade = async () => {
    setProcessing(true);
    const result = await startCheckout();
    if (!result.success) {
      toast.error("Erreur lors de la redirection vers le paiement");
    }
    setProcessing(false);
  };

  const handleManage = async () => {
    setProcessing(true);
    const result = await openCustomerPortal();
    if (!result.success) {
      toast.error("Erreur lors de l'ouverture du portail");
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header with Premium Badge */}
        <div className="text-center space-y-4">
          {isPremium && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent to-purple-600 text-white mb-4">
              <Crown className="h-4 w-4" />
              <span className="font-bold text-sm">
                {trialActive ? "ESSAI PREMIUM ACTIF" : "MEMBRE PREMIUM"}
              </span>
              {trialActive && trialEnd && (
                <span className="text-xs opacity-90">
                  jusqu'au {format(new Date(trialEnd), "d MMM", { locale: fr })}
                </span>
              )}
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            {isPremium ? "Gérez votre abonnement" : "Passez à la vitesse supérieure"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isPremium 
              ? "Vous avez accès à toutes les fonctionnalités premium." 
              : "Débloquez l'intelligence artificielle et maximisez vos profits."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          
          {/* Plan GRATUIT */}
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${!isPremium ? 'border-primary/50' : 'border-border opacity-70'}`}>
            {!isPremium && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                ACTUEL
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold">Starter</CardTitle>
              <CardDescription>L'essentiel pour commencer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-black">0€ <span className="text-base font-normal text-muted-foreground">/ mois</span></div>
                <p className="text-sm text-muted-foreground mt-1">Commission : 5% + 0.99€</p>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Billetterie illimitée</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Application de Scan</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Paiement à J+7</li>
                <li className="flex items-center gap-2 text-muted-foreground"><span className="w-4 text-center">✕</span> IA prédictive</li>
                <li className="flex items-center gap-2 text-muted-foreground"><span className="w-4 text-center">✕</span> Studio graphique IA</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                {!isPremium ? "Votre plan actuel" : "Plan gratuit"}
              </Button>
            </CardFooter>
          </Card>

          {/* Plan PRO */}
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${isPremium ? 'border-accent shadow-lg shadow-accent/10' : 'border-accent/50 hover:border-accent'}`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent to-purple-600" />
            
            {isPremium && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-accent text-accent-foreground gap-1">
                  <Crown className="h-3 w-3" />
                  ACTIF
                </Badge>
              </div>
            )}
            
            {!isPremium && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="gap-1 border-accent text-accent">
                  <Gift className="h-3 w-3" />
                  14 JOURS GRATUITS
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-accent font-bold text-sm">SPARK PRO</span>
              </div>
              <CardTitle className="text-xl font-bold">L'offre Ultime</CardTitle>
              <CardDescription>Rentabilité maximale & IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-black">150€ <span className="text-base font-normal text-muted-foreground">/ mois</span></div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold">
                  <Zap className="h-3 w-3" />
                  Commission fixe : 0.99€
                </div>
              </div>
              
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-accent mt-0.5" />
                  <div>
                    <span className="font-semibold">Revenus Instantanés</span>
                    <p className="text-xs text-muted-foreground">Argent en 10 secondes</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Cerveau IA Gemini</span>
                    <p className="text-xs text-muted-foreground">Analyses & prédictions</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Studio Graphique IA</span>
                    <p className="text-xs text-muted-foreground">Flyers illimités</p>
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" /> Support WhatsApp 24/7
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {isPremium ? (
                <Button 
                  variant="outline"
                  className="w-full gap-2" 
                  onClick={handleManage}
                  disabled={processing}
                >
                  <Settings className="h-4 w-4" />
                  {processing ? "Chargement..." : "Gérer l'abonnement"}
                </Button>
              ) : (
                <Button 
                  className="w-full h-12 font-bold bg-accent hover:bg-accent/90 text-accent-foreground" 
                  onClick={handleUpgrade}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      Essayer gratuitement 14 jours
                      <Gift className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <p className="text-center text-xs text-muted-foreground">
          Prix HT. Annulation possible à tout moment. Sans engagement après l'essai.
        </p>
      </div>
    </div>
  );
}
