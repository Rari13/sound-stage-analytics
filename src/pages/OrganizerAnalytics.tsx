import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Sparkles, Lock, BarChart3, Brain, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SalesData {
  date: string;
  tickets: number;
  revenue: number;
}

const OrganizerAnalytics = () => {
  const { user } = useAuth();
  const { subscription, loading: subLoading, isPremium, organizerId, upgradeToPremium } = useSubscription();
  const { toast } = useToast();
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    const fetchSalesData = async () => {
      if (!user || !organizerId) return;

      try {
        const { data: orgData } = await supabase
          .from("organizers")
          .select("id")
          .eq("owner_user_id", user.id)
          .single();

        if (!orgData) return;

        // Get all events
        const { data: events } = await supabase
          .from("events")
          .select("id")
          .eq("organizer_id", orgData.id);

        if (!events) return;

        // Get orders for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const eventIds = events.map(e => e.id);
        
        const { data: orders } = await supabase
          .from("orders")
          .select("created_at, amount_total_cents, event_id")
          .in("event_id", eventIds)
          .eq("status", "completed")
          .gte("created_at", thirtyDaysAgo.toISOString());

        // Group by date
        const grouped: Record<string, { tickets: number; revenue: number }> = {};
        
        orders?.forEach(order => {
          const date = format(new Date(order.created_at), "dd MMM", { locale: fr });
          if (!grouped[date]) {
            grouped[date] = { tickets: 0, revenue: 0 };
          }
          grouped[date].tickets += 1;
          grouped[date].revenue += order.amount_total_cents / 100;
        });

        const chartData = Object.entries(grouped).map(([date, data]) => ({
          date,
          tickets: data.tickets,
          revenue: data.revenue,
        }));

        setSalesData(chartData);
      } catch (error) {
        console.error("Error fetching sales data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (organizerId) {
      fetchSalesData();
    }
  }, [user, organizerId]);

  const handleAIAnalysis = async (type: string, eventId?: string, city?: string) => {
    if (!isPremium) {
      toast({
        title: "Abonnement Premium requis",
        description: "Cette fonctionnalité nécessite un abonnement Premium.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-analytics", {
        body: { type, organizerId, eventId, city },
      });

      if (error) throw error;

      setAiAnalysis(data.analysis);
      toast({
        title: "Analyse terminée",
        description: "L'IA a généré votre rapport d'analyse.",
      });
    } catch (error: any) {
      console.error("Error calling AI:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer l'analyse IA.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    const result = await upgradeToPremium();
    
    if (result.success) {
      toast({
        title: "Abonnement activé",
        description: "Vous avez maintenant accès aux fonctionnalités Premium !",
      });
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Impossible d'activer l'abonnement.",
        variant: "destructive",
      });
    }
    setUpgrading(false);
  };

  if (subLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-6 md:space-y-8">
        {/* Header with subscription status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Analytiques & IA</h1>
            <p className="text-sm md:text-base text-muted-foreground">Insights avancés pour vos événements</p>
          </div>
          <div className="flex items-center gap-3">
            {isPremium ? (
              <Badge variant="default" className="px-4 py-2">
                <Sparkles className="mr-2 h-4 w-4" />
                Premium Active
              </Badge>
            ) : (
              <Button variant="accent" size="lg" onClick={handleUpgrade} disabled={upgrading}>
                {upgrading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                Passer à Premium - 100€/mois
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="charts">
              <BarChart3 className="mr-2 h-4 w-4" />
              Graphiques
            </TabsTrigger>
            <TabsTrigger value="insights" disabled={!isPremium}>
              <Brain className="mr-2 h-4 w-4" />
              Insights IA
              {!isPremium && <Lock className="ml-2 h-3 w-3" />}
            </TabsTrigger>
            <TabsTrigger value="market" disabled={!isPremium}>
              <MapPin className="mr-2 h-4 w-4" />
              Analyse de marché
              {!isPremium && <Lock className="ml-2 h-3 w-3" />}
            </TabsTrigger>
            <TabsTrigger value="predictions" disabled={!isPremium}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Prédictions
              {!isPremium && <Lock className="ml-2 h-3 w-3" />}
            </TabsTrigger>
          </TabsList>

          {/* Free tier: Charts */}
          <TabsContent value="charts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des ventes (30 derniers jours)</CardTitle>
                <CardDescription>Gratuit - Analyse basique de vos performances</CardDescription>
              </CardHeader>
              <CardContent>
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="tickets" stroke="hsl(var(--primary))" name="Billets vendus" />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" name="Revenus (€)" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune donnée de vente disponible
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenus par jour</CardTitle>
              </CardHeader>
              <CardContent>
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(var(--accent))" name="Revenus (€)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium: General Insights */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assistant IA - Insights Généraux</CardTitle>
                <CardDescription>Obtenez des recommandations personnalisées basées sur vos performances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => handleAIAnalysis("general-insights")}
                  disabled={aiLoading}
                  className="w-full"
                >
                  {aiLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="mr-2 h-4 w-4" />
                  )}
                  Générer une analyse complète
                </Button>

                {aiAnalysis && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {aiAnalysis}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium: Market Analysis */}
          <TabsContent value="market" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analyse de marché par ville</CardTitle>
                <CardDescription>
                  Découvrez quels types d'événements ont le plus de potentiel dans une ville donnée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Entrez une ville (ex: Nancy, Paris, Lyon)"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-md border bg-background"
                  />
                  <Button 
                    onClick={() => handleAIAnalysis("market-analysis", undefined, selectedCity)}
                    disabled={aiLoading || !selectedCity}
                  >
                    {aiLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    Analyser
                  </Button>
                </div>

                {aiAnalysis && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {aiAnalysis}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium: Predictions */}
          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prédictions et recommandations</CardTitle>
                <CardDescription>
                  Fonctionnalité à venir : prédiction des ventes futures et optimisation tarifaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  Cette fonctionnalité sera bientôt disponible
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OrganizerAnalytics;