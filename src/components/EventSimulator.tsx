import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Wand2, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Brain
} from "lucide-react";
import { toast } from "sonner";

interface EventSimulatorProps {
  organizerId: string;
  onSimulationComplete?: (simulationId: string) => void;
}

interface SimulationInput {
  artistName: string;
  venueName: string;
  city: string;
  cachet: number;
  capacity: number;
  targetDate?: string;
}

interface SimulationResult {
  id: string;
  artist_name: string;
  venue_name: string;
  city: string;
  ipc_score: number;
  ipc_base: number;
  f_sat: number;
  m_la: number;
  expected_demand: number;
  demand_std_deviation: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  sell_out_probability: number;
  recommended_price_cents: number;
  expected_revenue_cents: number;
  expected_profit_cents: number;
  profit_margin: number;
  break_even_tickets: number;
  is_viable: boolean;
  ai_recommendation: string;
}

export function EventSimulator({ organizerId, onSimulationComplete }: EventSimulatorProps) {
  const [input, setInput] = useState<Partial<SimulationInput>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleInputChange = (field: keyof SimulationInput, value: string | number) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const handleSimulate = async () => {
    if (!input.artistName || !input.venueName || !input.city || !input.cachet || !input.capacity) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("simulate-event", {
        body: {
          organizerId,
          ...input
        },
      });

      if (error) throw error;

      setResult(data.simulation);
      toast.success("Simulation terminée avec succès !");
      if (onSimulationComplete) {
        onSimulationComplete(data.simulation.id);
      }

    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la simulation.");
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

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background/80 to-primary/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            Simulateur d'Événement
          </CardTitle>
          <CardDescription>
            Testez la rentabilité d'un événement avant de vous engager. Basé sur le modèle IPC/MPDU.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="artistName" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Nom de l'artiste *
              </Label>
              <Input 
                id="artistName" 
                placeholder="Ex: Nina Kraviz" 
                className="bg-background/50 border-primary/20"
                onChange={(e) => handleInputChange('artistName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venueName" className="flex items-center gap-1">
                <Target className="h-3 w-3 text-primary" />
                Nom du club *
              </Label>
              <Input 
                id="venueName" 
                placeholder="Ex: Le Rex Club" 
                className="bg-background/50 border-primary/20"
                onChange={(e) => handleInputChange('venueName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville *</Label>
              <Input 
                id="city" 
                placeholder="Ex: Paris" 
                className="bg-background/50 border-primary/20"
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cachet" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-500" />
                Cachet de l'artiste (€) *
              </Label>
              <Input 
                id="cachet" 
                type="number" 
                placeholder="Ex: 5000" 
                className="bg-background/50 border-primary/20"
                onChange={(e) => handleInputChange('cachet', parseInt(e.target.value, 10))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity" className="flex items-center gap-1">
                <Users className="h-3 w-3 text-blue-500" />
                Capacité du club *
              </Label>
              <Input 
                id="capacity" 
                type="number" 
                placeholder="Ex: 700" 
                className="bg-background/50 border-primary/20"
                onChange={(e) => handleInputChange('capacity', parseInt(e.target.value, 10))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Date envisagée (optionnel)</Label>
              <Input 
                id="targetDate" 
                type="date" 
                className="bg-background/50 border-primary/20"
                onChange={(e) => handleInputChange('targetDate', e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleSimulate} 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calcul en cours...</>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" /> Simuler la Rentabilité</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Viability Banner */}
          <Card className={`${result.is_viable ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <CardContent className="p-6 flex items-center gap-4">
              {result.is_viable ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-red-500" />
              )}
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${result.is_viable ? 'text-green-400' : 'text-red-400'}`}>
                  {result.is_viable ? 'Événement Rentable' : 'Risque de Perte'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {result.artist_name} @ {result.venue_name}, {result.city}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${result.expected_profit_cents >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.expected_profit_cents >= 0 ? '+' : ''}{(result.expected_profit_cents / 100).toFixed(0)}€
                </div>
                <div className="text-xs text-muted-foreground">Profit estimé</div>
              </div>
            </CardContent>
          </Card>

          {/* IPC Score Card */}
          <Card className={`border ${getScoreBg(result.ipc_score)}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Indice de Popularité Contextualisé (IPC)
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(result.ipc_score)}`}>
                  {(result.ipc_score * 100).toFixed(0)}%
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground mb-1">IPC Base</div>
                  <div className="text-lg font-semibold">{(result.ipc_base * 100).toFixed(0)}%</div>
                  <Progress value={result.ipc_base * 100} className="h-1.5 mt-1" />
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground mb-1">F. Saturation</div>
                  <div className="text-lg font-semibold">{(result.f_sat * 100).toFixed(0)}%</div>
                  <Progress value={result.f_sat * 100} className="h-1.5 mt-1" />
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground mb-1">Match Lieu</div>
                  <div className="text-lg font-semibold">{(result.m_la * 100).toFixed(0)}%</div>
                  <Progress value={result.m_la * 100} className="h-1.5 mt-1" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                IPC = IPC_Base × F_sat × M_la
              </p>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{Math.round(result.expected_demand)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Demande</div>
              </CardContent>
            </Card>

            <Card className={`border ${getScoreBg(result.sell_out_probability)}`}>
              <CardContent className="p-4 text-center">
                <Target className={`h-6 w-6 mx-auto mb-1 ${getScoreColor(result.sell_out_probability)}`} />
                <div className={`text-xl font-bold ${getScoreColor(result.sell_out_probability)}`}>
                  {(result.sell_out_probability * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Sold Out</div>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <div className="text-xl font-bold text-green-500">
                  {(result.recommended_price_cents / 100).toFixed(0)}€
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Prix Reco.</div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <div className="text-xl font-bold text-blue-500">
                  {result.break_even_tickets}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Seuil Rentab.</div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Résumé Financier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Revenus estimés</span>
                  <span className="font-semibold text-green-400">
                    +{(result.expected_revenue_cents / 100).toLocaleString()}€
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Cachet artiste</span>
                  <span className="font-semibold text-red-400">
                    -{(input.cachet || 0).toLocaleString()}€
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Profit net estimé</span>
                  <span className={`text-xl font-bold ${result.expected_profit_cents >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.expected_profit_cents >= 0 ? '+' : ''}{(result.expected_profit_cents / 100).toLocaleString()}€
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Marge bénéficiaire</span>
                  <Badge className={result.profit_margin >= 0.2 ? 'bg-green-500' : result.profit_margin >= 0 ? 'bg-yellow-500' : 'bg-red-500'}>
                    {(result.profit_margin * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendation */}
          {result.ai_recommendation && (
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-sm">Recommandation IA</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {result.ai_recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
