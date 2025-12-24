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
          <Card className={`relative overflow-hidden border transition-all duration-300 bg-card ${!isPremium ? 'border-border shadow-sm' : 'border-border opacity-60'}`}>
            {!isPremium && (
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="text-xs font-medium">
                  ACTUEL
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold">Starter</CardTitle>
              <CardDescription>L'essentiel pour commencer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-4xl font-black tracking-tight">0€ <span className="text-base font-normal text-muted-foreground">/ mois</span></div>
                <p className="text-sm text-muted-foreground mt-2">Commission : 1.50€ par billet</p>
              </div>
              
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  Billetterie illimitée
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  Application de Scan
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">✕</span>
                  </div>
                  Data Intelligence
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">✕</span>
                  </div>
                  Studio graphique IA
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-4">
              <Button variant="outline" className="w-full h-11" disabled>
                {!isPremium ? "Votre plan actuel" : "Plan gratuit"}
              </Button>
            </CardFooter>
          </Card>

          {/* Plan PRO */}
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 bg-gradient-to-br from-primary/5 via-background to-primary/5 ${isPremium ? 'border-primary shadow-xl shadow-primary/25' : 'border-primary/40 hover:border-primary hover:shadow-xl hover:shadow-primary/20'}`}>
            {/* Decorative elements */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
            
            {isPremium && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1 shadow-lg shadow-primary/40">
                  <Crown className="h-3 w-3" />
                  ACTIF
                </Badge>
              </div>
            )}
            
            {!isPremium && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="gap-1.5 bg-primary/10 text-primary border border-primary/30 px-3 py-1 font-semibold">
                  <Gift className="h-3 w-3" />
                  14 JOURS GRATUITS
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-4 relative pt-14">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-primary font-bold tracking-wide">SPARK PRO</span>
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">L'offre Ultime</CardTitle>
              <CardDescription>Rentabilité maximale & IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div>
                <div className="text-4xl font-black tracking-tight text-primary">150€ <span className="text-base font-normal text-muted-foreground">/ mois</span></div>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 text-primary text-sm font-bold border border-primary/25">
                  <Zap className="h-4 w-4" />
                  Commission fixe : 0.99€
                </div>
              </div>
              
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center mt-0.5 shrink-0">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Revenus Instantanés</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Argent en 10 secondes</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center mt-0.5 shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Data Intelligence</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Analyses & prédictions</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center mt-0.5 shrink-0">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Studio Graphique IA</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Flyers illimités</p>
                  </div>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="relative pt-4">
              {isPremium ? (
                <Button 
                  variant="outline"
                  className="w-full h-12 gap-2 border-primary text-primary hover:bg-primary/10 font-semibold" 
                  onClick={handleManage}
                  disabled={processing}
                >
                  <Settings className="h-4 w-4" />
                  {processing ? "Chargement..." : "Gérer l'abonnement"}
                </Button>
              ) : (
                <Button 
                  className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 gap-2" 
                  onClick={handleUpgrade}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Essayer gratuitement 14 jours
                      <Gift className="h-4 w-4" />
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
