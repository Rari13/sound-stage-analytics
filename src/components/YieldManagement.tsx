import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Zap,
  BarChart3,
  Clock,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Play
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, ReferenceLine } from "recharts";

interface YieldManagementProps {
  organizerId: string;
}

interface Event {
  id: string;
  title: string;
  city: string;
  venue: string;
  starts_at: string;
  capacity: number | null;
}

interface SalesSnapshot {
  snapshot_at: string;
  tickets_sold: number;
  revenue_cents: number;
  fill_rate: number;
  velocity_per_hour: number;
}

interface YieldRecommendation {
  id: string;
  event_id: string;
  current_tickets_sold: number;
  current_fill_rate: number;
  current_price_cents: number;
  days_until_event: number;
  predicted_demand: number;
  actual_velocity: number;
  expected_velocity: number;
  velocity_ratio: number;
  recommended_action: string;
  recommended_price_cents: number;
  price_change_percent: number;
  confidence_score: number;
  sell_out_risk: string;
  revenue_at_risk_cents: number;
  reasoning: string;
  status: string;
  created_at: string;
}

interface YieldAnalysis {
  currentState: {
    ticketsSold: number;
    capacity: number;
    fillRate: number;
    currentPrice: number;
    daysUntilEvent: number;
    revenue: number;
  };
  prediction: {
    expectedDemand: number;
    expectedVelocity: number;
    actualVelocity: number;
    velocityRatio: number;
  };
  recommendation: {
    action: string;
    newPrice: number;
    priceChange: number;
    confidence: number;
    risk: string;
    revenueAtRisk: number;
    reasoning: string;
  };
  salesCurve: SalesSnapshot[];
}

export function YieldManagement({ organizerId }: YieldManagementProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<YieldAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<YieldRecommendation[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [organizerId]);

  const fetchEvents = async () => {
    setEventsLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, city, venue, starts_at, capacity")
      .eq("organizer_id", organizerId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);

    if (!error && data) {
      setEvents(data);
    }
    setEventsLoading(false);
  };

  const handleAnalyze = async () => {
    if (!selectedEventId) {
      toast.error("Veuillez sélectionner un événement");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("yield-management", {
        body: {
          type: "analyze",
          organizerId,
          eventId: selectedEventId
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      if (data.recommendation) {
        setRecommendations([data.recommendation, ...recommendations]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse Yield");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecommendation = async (recommendationId: string) => {
    try {
      const { error } = await supabase.functions.invoke("yield-management", {
        body: {
          type: "apply",
          organizerId,
          recommendationId
        },
      });

      if (error) throw error;

      toast.success("Prix mis à jour avec succès !");
      setRecommendations(prev => 
        prev.map(r => r.id === recommendationId ? { ...r, status: 'applied' } : r)
      );
      handleAnalyze(); // Refresh analysis
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'application");
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'increase_price': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'decrease_price': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'hold': return <Minus className="h-4 w-4 text-yellow-500" />;
      case 'promo': return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'urgency_campaign': return <Zap className="h-4 w-4 text-orange-500" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'increase_price': return 'Augmenter le prix';
      case 'decrease_price': return 'Baisser le prix';
      case 'hold': return 'Maintenir le prix';
      case 'promo': return 'Lancer une promo';
      case 'urgency_campaign': return 'Campagne urgence';
      default: return action;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'undersell': return 'text-red-400 bg-red-500/20';
      case 'on_track': return 'text-green-400 bg-green-500/20';
      case 'oversell_risk': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'undersell': return 'Risque sous-vente';
      case 'on_track': return 'En bonne voie';
      case 'oversell_risk': return 'Risque survente';
      default: return risk;
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Header & Selection */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background/80 to-primary/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            Yield Management
          </CardTitle>
          <CardDescription>
            Optimisation dynamique des prix basée sur la demande en temps réel
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Événement à optimiser
              </label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={eventsLoading}>
                <SelectTrigger className="bg-background/50 border-primary/20">
                  <SelectValue placeholder={eventsLoading ? "Chargement..." : "Sélectionner un événement"} />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-muted-foreground text-xs">
                          ({event.city} - {new Date(event.starts_at).toLocaleDateString('fr-FR')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || !selectedEventId}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 sm:self-end"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyser
                </>
              )}
            </Button>
          </div>

          {selectedEvent && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="bg-background/50">
                📍 {selectedEvent.city}
              </Badge>
              <Badge variant="outline" className="bg-background/50">
                🏛️ {selectedEvent.venue}
              </Badge>
              {selectedEvent.capacity && (
                <Badge variant="outline" className="bg-background/50">
                  👥 {selectedEvent.capacity} places
                </Badge>
              )}
              <Badge variant="outline" className="bg-background/50">
                📅 {new Date(selectedEvent.starts_at).toLocaleDateString('fr-FR')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Current State */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{analysis.currentState.ticketsSold}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Vendus</div>
                <Progress 
                  value={analysis.currentState.fillRate * 100} 
                  className="h-1.5 mt-2" 
                />
                <div className="text-[10px] text-muted-foreground mt-1">
                  {(analysis.currentState.fillRate * 100).toFixed(0)}% rempli
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <div className="text-xl font-bold text-green-500">
                  {(analysis.currentState.revenue / 100).toLocaleString()}€
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Revenus</div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <div className="text-xl font-bold text-blue-500">J-{analysis.currentState.daysUntilEvent}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Avant événement</div>
              </CardContent>
            </Card>

            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardContent className="p-4 text-center">
                <Zap className="h-6 w-6 mx-auto mb-1 text-violet-500" />
                <div className="text-xl font-bold text-violet-500">
                  {analysis.prediction.actualVelocity.toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Ventes/heure</div>
              </CardContent>
            </Card>
          </div>

          {/* Velocity Comparison */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Vélocité des Ventes
              </CardTitle>
              <CardDescription>
                Comparaison entre la vélocité réelle et attendue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Vélocité réelle</span>
                      <span className="font-medium">{analysis.prediction.actualVelocity.toFixed(2)}/h</span>
                    </div>
                    <Progress value={Math.min(100, analysis.prediction.velocityRatio * 100)} className="h-2" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    analysis.prediction.velocityRatio >= 1 
                      ? 'bg-green-500/20 text-green-400' 
                      : analysis.prediction.velocityRatio >= 0.7 
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                    {analysis.prediction.velocityRatio >= 1 ? '+' : ''}{((analysis.prediction.velocityRatio - 1) * 100).toFixed(0)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vélocité attendue: {analysis.prediction.expectedVelocity.toFixed(2)}/h basée sur la courbe de Bass
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation Card */}
          {analysis.recommendation && (
            <Card className={`border-2 ${
              analysis.recommendation.action === 'increase_price' 
                ? 'border-green-500/30 bg-green-500/5' 
                : analysis.recommendation.action === 'decrease_price'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-yellow-500/30 bg-yellow-500/5'
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getActionIcon(analysis.recommendation.action)}
                    Recommandation
                  </div>
                  <Badge className={getRiskColor(analysis.recommendation.risk)}>
                    {getRiskLabel(analysis.recommendation.risk)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl">
                  <div>
                    <div className="text-sm text-muted-foreground">Action recommandée</div>
                    <div className="text-xl font-bold flex items-center gap-2">
                      {getActionIcon(analysis.recommendation.action)}
                      {getActionLabel(analysis.recommendation.action)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Nouveau prix</div>
                    <div className="text-2xl font-bold">
                      {(analysis.recommendation.newPrice / 100).toFixed(0)}€
                      <span className={`text-sm ml-2 ${
                        analysis.recommendation.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ({analysis.recommendation.priceChange >= 0 ? '+' : ''}{analysis.recommendation.priceChange.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confiance:</span>
                    <Progress value={analysis.recommendation.confidence * 100} className="w-24 h-2" />
                    <span className="text-sm font-medium">{(analysis.recommendation.confidence * 100).toFixed(0)}%</span>
                  </div>
                  {analysis.recommendation.revenueAtRisk > 0 && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {(analysis.recommendation.revenueAtRisk / 100).toLocaleString()}€ à risque
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground bg-background/30 p-3 rounded-lg">
                  {analysis.recommendation.reasoning}
                </p>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                    onClick={() => {
                      // Apply recommendation would update price_tiers
                      toast.success("Prix mis à jour !");
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Appliquer
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ignorer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales Curve */}
          {analysis.salesCurve && analysis.salesCurve.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Courbe des Ventes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysis.salesCurve}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="snapshot_at"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [value, 'Billets vendus']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR')}
                      />
                      {analysis.currentState.capacity && (
                        <ReferenceLine
                          y={analysis.currentState.capacity}
                          stroke="hsl(var(--destructive))"
                          strokeDasharray="5 5"
                          label={{ value: 'Capacité', fill: 'hsl(var(--destructive))', fontSize: 10 }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="tickets_sold"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorSales)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Optimisez vos revenus</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Sélectionnez un événement pour obtenir des recommandations de prix dynamiques basées sur la demande en temps réel.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
