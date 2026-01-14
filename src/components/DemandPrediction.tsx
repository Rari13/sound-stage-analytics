import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  TrendingUp, 
  Target, 
  Zap, 
  Users, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Brain,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, ReferenceLine } from "recharts";

interface DemandPredictionProps {
  organizerId: string;
}

interface Event {
  id: string;
  title: string;
  city: string;
  venue: string;
  starts_at: string;
  capacity: number | null;
  music_genres: string[] | null;
}

interface PredictionResult {
  ipc_score: number;
  ipc_base: number;
  f_sat: number;
  m_la: number;
  expected_demand: number;
  std_deviation: number;
  sell_out_probability: number;
  optimal_price_cents: number;
  recommended_price_cents: number;
  confidence_interval: { low: number; high: number };
  bass_curve: Array<{ day: number; cumulative: number; daily: number }>;
  ai_insights: string;
}

export function DemandPrediction({ organizerId }: DemandPredictionProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [organizerId]);

  const fetchEvents = async () => {
    setEventsLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, city, venue, starts_at, capacity, music_genres")
      .eq("organizer_id", organizerId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);

    if (!error && data) {
      setEvents(data);
    }
    setEventsLoading(false);
  };

  const handlePredict = async () => {
    if (!selectedEventId) {
      toast.error("Veuillez sélectionner un événement");
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-analytics", {
        body: {
          type: "demand-prediction",
          organizerId,
          eventId: selectedEventId
        },
      });

      if (error) throw error;

      setPrediction(data.prediction);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la prédiction");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-400";
    if (score >= 0.4) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 0.7) return "bg-green-500/20 border-green-500/30";
    if (score >= 0.4) return "bg-yellow-500/20 border-yellow-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  const getProbabilityLabel = (prob: number) => {
    if (prob >= 0.8) return { label: "Très probable", color: "bg-green-500" };
    if (prob >= 0.5) return { label: "Probable", color: "bg-yellow-500" };
    if (prob >= 0.3) return { label: "Incertain", color: "bg-orange-500" };
    return { label: "Peu probable", color: "bg-red-500" };
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Selection Card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background/80 to-primary/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            Prédiction de Demande (IPC + MPDU)
          </CardTitle>
          <CardDescription>
            Modèle unifié de prédiction basé sur l'Indice de Popularité Contextualisé
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Événement à analyser
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
              onClick={handlePredict}
              disabled={loading || !selectedEventId}
              className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 sm:self-end"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calcul...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Prédire la demande
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
              {selectedEvent.music_genres?.slice(0, 2).map((genre) => (
                <Badge key={genre} variant="outline" className="bg-primary/10 text-primary">
                  🎵 {genre}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {prediction && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* IPC Score Card */}
          <Card className={`border ${getScoreBg(prediction.ipc_score)}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Indice de Popularité Contextualisé (IPC)
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(prediction.ipc_score)}`}>
                  {(prediction.ipc_score * 100).toFixed(0)}%
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground mb-1">IPC Base</div>
                  <div className="text-lg font-semibold">{(prediction.ipc_base * 100).toFixed(0)}%</div>
                  <Progress value={prediction.ipc_base * 100} className="h-1.5 mt-1" />
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground mb-1">F. Saturation</div>
                  <div className="text-lg font-semibold">{(prediction.f_sat * 100).toFixed(0)}%</div>
                  <Progress value={prediction.f_sat * 100} className="h-1.5 mt-1" />
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground mb-1">Match Lieu</div>
                  <div className="text-lg font-semibold">{(prediction.m_la * 100).toFixed(0)}%</div>
                  <Progress value={prediction.m_la * 100} className="h-1.5 mt-1" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                IPC = IPC_Base × F_sat × M_la = {(prediction.ipc_base * prediction.f_sat * prediction.m_la * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Demand & Sellout Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Expected Demand */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{Math.round(prediction.expected_demand)}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                  Demande attendue
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">
                  ± {Math.round(prediction.std_deviation)} (σ)
                </div>
              </CardContent>
            </Card>

            {/* Sellout Probability */}
            <Card className={`border ${getScoreBg(prediction.sell_out_probability)}`}>
              <CardContent className="p-6 text-center">
                {prediction.sell_out_probability >= 0.5 ? (
                  <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${getScoreColor(prediction.sell_out_probability)}`} />
                ) : (
                  <AlertTriangle className={`h-8 w-8 mx-auto mb-2 ${getScoreColor(prediction.sell_out_probability)}`} />
                )}
                <div className={`text-2xl font-bold ${getScoreColor(prediction.sell_out_probability)}`}>
                  {(prediction.sell_out_probability * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                  Prob. Sold Out
                </div>
                <Badge className={`mt-2 ${getProbabilityLabel(prediction.sell_out_probability).color}`}>
                  {getProbabilityLabel(prediction.sell_out_probability).label}
                </Badge>
              </CardContent>
            </Card>

            {/* Recommended Price */}
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-green-500">
                  {(prediction.recommended_price_cents / 100).toFixed(0)}€
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                  Prix recommandé
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">
                  Optimal: {(prediction.optimal_price_cents / 100).toFixed(0)}€
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Confidence Interval */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Intervalle de Confiance (95%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pt-4 pb-2">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Pessimiste</span>
                  <span>Attendu</span>
                  <span>Optimiste</span>
                </div>
                <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-red-500/50 via-primary/50 to-green-500/50"
                    style={{
                      left: `${(prediction.confidence_interval.low / (prediction.confidence_interval.high * 1.2)) * 100}%`,
                      right: `${100 - (prediction.confidence_interval.high / (prediction.confidence_interval.high * 1.2)) * 100}%`
                    }}
                  />
                  <div 
                    className="absolute w-1 h-full bg-primary"
                    style={{
                      left: `${(prediction.expected_demand / (prediction.confidence_interval.high * 1.2)) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm font-medium mt-2">
                  <span className="text-red-400">{Math.round(prediction.confidence_interval.low)}</span>
                  <span className="text-primary">{Math.round(prediction.expected_demand)}</span>
                  <span className="text-green-400">{Math.round(prediction.confidence_interval.high)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bass Diffusion Curve */}
          {prediction.bass_curve && prediction.bass_curve.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Courbe de Diffusion (Modèle Bass)
                </CardTitle>
                <CardDescription>
                  Prévision des ventes cumulées jusqu'à l'événement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={prediction.bass_curve}>
                      <defs>
                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => `J-${Math.abs(val)}`}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => [
                          Math.round(value),
                          name === 'cumulative' ? 'Ventes cumulées' : 'Ventes/jour'
                        ]}
                        labelFormatter={(label) => `Jour ${label < 0 ? label : '+' + label}`}
                      />
                      {selectedEvent?.capacity && (
                        <ReferenceLine
                          y={selectedEvent.capacity}
                          stroke="hsl(var(--destructive))"
                          strokeDasharray="5 5"
                          label={{ value: 'Capacité', fill: 'hsl(var(--destructive))', fontSize: 10 }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorCumulative)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {prediction.ai_insights && (
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Analyse IA</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {prediction.ai_insights}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!prediction && !loading && (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-muted-foreground mb-2">
              Prédiction de demande avancée
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Sélectionnez un événement pour calculer l'Indice de Popularité Contextualisé (IPC) 
              et prédire la demande avec le modèle MPDU unifié.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
