import { useNavigate } from "react-router-dom";
import { Lock, Sparkles, Brain, TrendingUp, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PremiumGateProps {
  feature: "analytics" | "studio";
  onUpgrade?: () => void;
}

const featureInfo = {
  analytics: {
    title: "Intelligence IA",
    icon: Brain,
    description: "Débloquez des analyses prédictives et des insights personnalisés pour optimiser vos événements.",
    benefits: [
      { icon: TrendingUp, text: "Analyses de performance en temps réel" },
      { icon: Brain, text: "Prédictions IA basées sur vos données" },
      { icon: Sparkles, text: "Recommandations stratégiques personnalisées" },
    ]
  },
  studio: {
    title: "Spark Studio AI",
    icon: Sparkles,
    description: "Créez des affiches professionnelles en quelques secondes grâce à notre IA créative.",
    benefits: [
      { icon: Sparkles, text: "Génération d'affiches illimitée" },
      { icon: TrendingUp, text: "Designs professionnels personnalisés" },
      { icon: Zap, text: "Intégration de votre logo automatique" },
    ]
  }
};

export function PremiumGate({ feature, onUpgrade }: PremiumGateProps) {
  const navigate = useNavigate();
  const info = featureInfo[feature];
  const Icon = info.icon;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate("/orga/subscription");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 border-dashed border-primary/30 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 relative">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full p-1.5">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{info.title}</CardTitle>
          <CardDescription className="text-base">{info.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {info.benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-4 w-4 text-primary" />
                </div>
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-accent">
              Inclus dans le pack Premium à <span className="font-bold">150€/mois</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              + Revenus instantanés + Support 24/7
            </p>
          </div>

          <Button 
            onClick={handleUpgrade}
            className="w-full h-12 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Lock className="h-4 w-4 mr-2" />
            Débloquer cette fonctionnalité
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}