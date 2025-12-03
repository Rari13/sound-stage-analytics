import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Users, Heart, MousePointerClick, Lock, Loader2, TrendingUp, Sparkles, MapPin } from "lucide-react";
import { DataImporter } from "@/components/DataImporter";
import { toast } from "sonner";

export default function OrganizerAnalytics() {
  const { user } = useAuth();
  const { isPremium, organizerId, upgradeToPremium } = useSubscription();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [audienceStats, setAudienceStats] = useState({ followers: 0 });
  const [upgrading, setUpgrading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");

  useEffect(() => {
    if (organizerId) {
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId)
        .then(({ count }) =>
          setAudienceStats((prev) => ({ ...prev, followers: count || 0 }))
        );
    }
  }, [organizerId]);

  const handleAIAnalysis = async (type: string, city?: string) => {
    if (!isPremium) {
      toast.error("Fonctionnalité Premium requise");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-analytics", {
        body: { type, organizerId, city },
      });
      if (error) throw error;
      setAiAnalysis(data.analysis);
      toast.success("Analyse générée");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse IA");
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    const result = await upgradeToPremium();
    if (result.success) {
      toast.success("Abonnement Premium activé !");
    } else {
      toast.error(result.error || "Erreur lors de l'activation");
    }
    setUpgrading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Intelligence</h1>
        {!isPremium && (
          <Button variant="accent" size="sm" onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Premium
          </Button>
        )}
      </div>

      {/* KPIs Audience */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{audienceStats.followers}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Abonnés
            </div>
          </CardContent>
        </Card>
        <Card className="border-pink-500/20 bg-pink-500/5">
          <CardContent className="p-4 text-center">
            <Heart className="h-5 w-5 text-pink-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">--</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Likes
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <MousePointerClick className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">--%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Conv.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insight Psychologique */}
      <Card className="border-primary/30 bg-gradient-to-br from-background to-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-5">
          <Brain className="h-24 w-24" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Psychologie Client
          </CardTitle>
          <CardDescription>
            Analyse comportementale de votre audience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-background/60 backdrop-blur rounded-xl border text-sm leading-relaxed min-h-[80px]">
            {aiAnalysis || (
              <span className="text-muted-foreground">
                Cliquez sur le bouton pour analyser le comportement de vos
                clients et obtenir des conseils stratégiques.
              </span>
            )}
          </div>
          <Button
            onClick={() => handleAIAnalysis("general-insights")}
            disabled={aiLoading || !isPremium}
            className="w-full"
          >
            {aiLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="mr-2 h-4 w-4" />
            )}
            {isPremium ? "Générer l'analyse IA" : "Premium requis"}
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="data">Données</TabsTrigger>
          <TabsTrigger value="market">Marché</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-4">
          <DataImporter organizerId={organizerId || ""} />
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          {isPremium ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Analyse de marché</h3>
                  <p className="text-sm text-muted-foreground">
                    Découvrez le potentiel d'une ville
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Paris, Lyon, Nancy..."
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border bg-background text-sm"
                />
                <Button
                  onClick={() => handleAIAnalysis("market-analysis", selectedCity)}
                  disabled={aiLoading || !selectedCity}
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Analyser"
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Analyse de marché disponible en Premium
              </p>
              <Button
                variant="accent"
                className="mt-4"
                onClick={handleUpgrade}
                disabled={upgrading}
              >
                Passer Premium
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
