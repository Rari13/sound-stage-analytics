import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StrategyTipsProps {
  daysLeft: number;
  ticketsSold: number;
  capacity: number;
}

export function StrategyTips({ daysLeft, ticketsSold, capacity }: StrategyTipsProps) {
  const sellRate = capacity > 0 ? (ticketsSold / capacity) * 100 : 0;
  
  const getTip = () => {
    if (sellRate >= 90) {
      return {
        icon: TrendingUp,
        color: "text-green-500",
        bg: "bg-green-500/10",
        border: "border-green-200 dark:border-green-800",
        title: "Dernière ligne droite !",
        text: "Il ne reste presque plus de places. Augmentez le prix des derniers billets de 10% pour maximiser la marge (Yield Management)."
      };
    }
    if (daysLeft < 7 && sellRate < 50) {
      return {
        icon: AlertTriangle,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-800",
        title: "Action requise",
        text: "Les ventes sont lentes pour la dernière semaine. Lancez une offre flash 'Duo' (2 billets pour le prix d'1.5) pendant 24h."
      };
    }
    if (daysLeft > 30 && sellRate < 20) {
      return {
        icon: Lightbulb,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-200 dark:border-blue-800",
        title: "Phase de lancement",
        text: "C'est le moment d'annoncer les Early Birds. Envoyez une newsletter à votre base de fans fidèles."
      };
    }
    return {
      icon: CheckCircle,
      color: "text-primary",
      bg: "bg-primary/5",
      border: "border-border",
      title: "Tout est sous contrôle",
      text: "La courbe de vente suit une progression normale. Préparez vos visuels pour les réseaux sociaux."
    };
  };

  const tip = getTip();

  return (
    <Card className={`p-4 border ${tip.border} ${tip.bg} relative overflow-hidden transition-all hover:shadow-md`}>
      <div className="flex gap-4 items-start relative z-10">
        <div className={`p-2 rounded-xl bg-background ${tip.color} shadow-sm`}>
          <tip.icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className={`font-bold text-sm ${tip.color} mb-1`}>{tip.title}</h4>
          <p className="text-xs text-foreground/80 leading-relaxed font-medium">
            {tip.text}
          </p>
        </div>
      </div>
      <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full ${tip.color} opacity-5 blur-2xl`} />
    </Card>
  );
}
