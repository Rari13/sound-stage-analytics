import { useState } from "react";
import { Check, Sparkles, Zap, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

export default function OrganizerSubscription() {
  const { isPremium, upgradeToPremium, loading } = useSubscription();
  const [processing, setProcessing] = useState(false);

  const handleUpgrade = async () => {
    setProcessing(true);
    const result = await upgradeToPremium();
    if (result.success) {
      toast.success("Félicitations ! L'IA est maintenant à votre service.");
    } else {
      toast.error("Erreur lors de l'activation");
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Passez à la vitesse supérieure
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Débloquez l'intelligence artificielle et maximisez vos profits.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch pt-4">
          
          {/* Plan GRATUIT */}
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${!isPremium ? 'border-primary ring-4 ring-primary/5' : 'border-border opacity-80 hover:opacity-100'}`}>
            {!isPremium && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                ACTUEL
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Starter</CardTitle>
              <CardDescription>L'essentiel pour commencer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-4xl font-black">0€ <span className="text-lg font-normal text-muted-foreground">/ mois</span></div>
                <p className="text-sm font-medium text-muted-foreground mt-2">Commission standard : 5% + 0.99€</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500 shrink-0" /> Billetterie illimitée</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500 shrink-0" /> Application de Scan</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500 shrink-0" /> Paiement à J+7</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground"><span className="w-5 text-center text-xs">✕</span> Pas d'IA prédictive</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground"><span className="w-5 text-center text-xs">✕</span> Pas de support prioritaire</li>
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button variant="outline" className="w-full h-12 rounded-xl" disabled={!isPremium}>
                {!isPremium ? "Votre plan actuel" : "Revenir au plan Starter"}
              </Button>
            </CardFooter>
          </Card>

          {/* Plan PRO (150€) */}
          <Card className={`relative overflow-hidden border-2 transform transition-all duration-300 ${isPremium ? 'border-accent scale-[1.02] shadow-lg' : 'border-accent/50 hover:border-accent hover:shadow-md'}`}>
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent to-purple-600" />
            {isPremium && (
              <div className="absolute top-4 right-4">
                <Badge className="px-3 py-1 bg-accent text-accent-foreground">ACTIF</Badge>
              </div>
            )}
            {!isPremium && (
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent rotate-45 flex items-end justify-center pb-2 shadow-lg">
                <Crown className="h-6 w-6 text-accent-foreground -rotate-45" />
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-accent/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <span className="text-accent font-bold tracking-wider text-sm uppercase">Sound Pro + IA</span>
              </div>
              <CardTitle className="text-2xl font-bold">L'offre Ultime</CardTitle>
              <CardDescription>Rentabilité maximale & Technologie de pointe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-4xl font-black flex items-baseline gap-2">
                  150€ <span className="text-lg font-normal text-muted-foreground">/ mois</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                  <Zap className="h-3 w-3 text-green-600 dark:text-green-400 fill-current" />
                  <span className="text-xs font-bold text-green-700 dark:text-green-300">Commission fixe unique : 0.99€</span>
                </div>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm">
                  <div className="p-1 rounded-full bg-accent/10 mt-0.5"><Zap className="h-3 w-3 text-accent" /></div>
                  <div>
                    <span className="font-bold">Revenus Instantanés (Bridge)</span>
                    <p className="text-xs text-muted-foreground">Recevez votre argent en 10 secondes.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-900/30 mt-0.5"><Sparkles className="h-3 w-3 text-purple-600" /></div>
                  <div>
                    <span className="font-bold">Cerveau IA Gemini</span>
                    <p className="text-xs text-muted-foreground">Analyses de marché & prédictions illimitées.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 mt-0.5"><TrendingUp className="h-3 w-3 text-blue-600" /></div>
                  <div>
                    <span className="font-bold">Studio Graphique IA</span>
                    <p className="text-xs text-muted-foreground">Génération de flyers illimitée.</p>
                  </div>
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-5 w-5 text-accent" /> Support WhatsApp Dédié 24/7
                </li>
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button 
                className="w-full h-14 text-lg font-bold shadow-lg shadow-accent/25 rounded-xl transition-all hover:scale-[1.02] bg-accent text-accent-foreground hover:bg-accent/90" 
                onClick={handleUpgrade}
                disabled={isPremium || processing}
              >
                {processing ? (
                  <>Activation en cours...</>
                ) : isPremium ? (
                  "Gérer mon abonnement"
                ) : (
                  <>Passer Pro maintenant <span className="ml-2 text-xs font-normal opacity-80">(14j essai offert)</span></>
                )}
              </Button>
            </CardFooter>
          </Card>

        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Prix hors taxes. Annulation possible à tout moment. Les paiements instantanés nécessitent un compte bancaire compatible SEPA Instant.
        </p>
      </div>
    </div>
  );
}
