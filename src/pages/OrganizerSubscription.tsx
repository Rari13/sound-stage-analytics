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
                <p className="text-sm text-muted-foreground mt-1">Commission : 1.50€ fixe</p>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Billetterie illimitée</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Application de Scan</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Paiement immédiat</li>
                <li className="flex items-center gap-2 text-muted-foreground"><span className="w-4 text-center">✕</span> Data Intelligence</li>
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
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${isPremium ? 'border-primary shadow-xl shadow-primary/20' : 'border-primary/50 hover:border-primary hover:shadow-lg hover:shadow-primary/10'}`}>
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-electric to-primary" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-electric/10 rounded-full blur-2xl" />
            
            {isPremium && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary text-primary-foreground gap-1 shadow-lg shadow-primary/30">
                  <Crown className="h-3 w-3" />
                  ACTIF
                </Badge>
              </div>
            )}
            
            {!isPremium && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="gap-1 border-primary text-primary font-bold">
                  <Gift className="h-3 w-3" />
                  14 JOURS GRATUITS
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-primary font-bold text-sm">SPARK PRO</span>
                <Zap className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <CardTitle className="text-xl font-bold">L'offre Ultime</CardTitle>
              <CardDescription>Rentabilité maximale & IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              <div>
                <div className="text-3xl font-black text-primary">150€ <span className="text-base font-normal text-muted-foreground">/ mois</span></div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                  <Zap className="h-3 w-3" />
                  Commission fixe : 0.99€
                </div>
              </div>
              
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <span className="font-semibold">Revenus Instantanés</span>
                    <p className="text-xs text-muted-foreground">Argent en 10 secondes</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <span className="font-semibold">Data Intelligence</span>
                    <p className="text-xs text-muted-foreground">Analyses & prédictions</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <span className="font-semibold">Studio Graphique IA</span>
                    <p className="text-xs text-muted-foreground">Flyers illimités</p>
                  </div>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="relative">
              {isPremium ? (
                <Button 
                  variant="outline"
                  className="w-full gap-2 border-primary text-primary hover:bg-primary/10" 
                  onClick={handleManage}
                  disabled={processing}
                >
                  <Settings className="h-4 w-4" />
                  {processing ? "Chargement..." : "Gérer l'abonnement"}
                </Button>
              ) : (
                <Button 
                  className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40" 
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
                      <Zap className="h-4 w-4 mr-2" />
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
