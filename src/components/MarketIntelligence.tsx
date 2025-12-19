import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, TrendingUp, DollarSign, Thermometer, ShieldAlert, Lightbulb, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";

interface MarketAnalysis {
  risk_level: "High" | "Medium" | "Low";
  market_price_avg: number;
  recommended_price: number;
  advice: string;
  trend_data?: Array<{
    mois: string;
    volume_billets: number;
    prix_moyen: number;
    trend_status: string;
  }>;
  insufficient_data?: boolean;
}

interface MarketIntelligenceProps {
  organizerId: string;
}

const MUSIC_GENRES = [
  "Techno", "House", "Rap", "Hip-Hop", "R&B", "Jazz", "Rock", 
  "Pop", "Électro", "Afrobeat", "Reggaeton", "Latin", "Classique"
];

export function MarketIntelligence({ organizerId }: MarketIntelligenceProps) {
  const [city, setCity] = useState("");
  const [genre, setGenre] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!city || !genre || !targetDate) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      // First, get market trends from the database
      const { data: trendData, error: trendError } = await supabase
        .rpc('get_market_trends', { 
          target_city: city, 
          target_genre: genre 
        });

      // Call AI for analysis
      const { data, error } = await supabase.functions.invoke("ai-analytics", {
        body: { 
          type: "market-simulation",
          organizerId,
          city,
          genre,
          targetDate,
          marketData: trendData || []
        },
      });

      if (error) throw error;

      // Check if data is insufficient (rule of 3)
      if (!trendData || trendData.length === 0) {
        setAnalysis({
          risk_level: "Medium",
          market_price_avg: 0,
          recommended_price: 0,
          advice: data?.analysis || "Données insuffisantes",
          insufficient_data: true,
          trend_data: []
        });
      } else {
        // Parse AI response or use structured data
        const avgPrice = trendData.reduce((sum: number, t: any) => sum + (parseFloat(t.prix_moyen) || 0), 0) / trendData.length;
        const avgFill = trendData.reduce((sum: number, t: any) => sum + (parseFloat(t.remplissage) || 0), 0) / trendData.length;
        
        setAnalysis({
          risk_level: avgFill > 75 ? "Low" : avgFill > 50 ? "Medium" : "High",
          market_price_avg: Math.round(avgPrice * 100) / 100,
          recommended_price: Math.round((avgPrice * 1.05) * 100) / 100,
          advice: data?.analysis || `Le marché ${city} pour le ${genre} montre un taux de remplissage moyen de ${avgFill.toFixed(0)}%.`,
          trend_data: trendData.slice(0, 6).reverse()
        });
      }

    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Low": return "text-green-400";
      case "Medium": return "text-yellow-400";
      case "High": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case "Low": return "bg-green-500/20 border-green-500/30";
      case "Medium": return "bg-yellow-500/20 border-yellow-500/30";
      case "High": return "bg-red-500/20 border-red-500/30";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Card - Glassmorphism */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background/80 to-primary/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Thermometer className="h-5 w-5 text-white" />
            </div>
            Simulateur de Marché
          </CardTitle>
          <CardDescription>
            Analysez le potentiel d'une soirée avant de la créer
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Ville
              </label>
              <Input
                placeholder="Ex: Paris, Lyon..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-background/50 border-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Genre Musical
              </label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-background/50 border-primary/20">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {MUSIC_GENRES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Date prévue
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-background/50 border-primary/20"
              />
            </div>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={loading || !city || !genre || !targetDate}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Thermometer className="mr-2 h-4 w-4" />
                Analyser le marché
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Insufficient Data Warning */}
          {analysis.insufficient_data ? (
            <Card className="border-yellow-500/30 bg-yellow-500/10">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-500 mb-1">Données insuffisantes</h3>
                  <p className="text-sm text-muted-foreground">
                    Pour garantir l'anonymat des organisateurs, nous ne pouvons afficher les tendances que lorsqu'au moins 3 organisateurs différents ont créé des événements dans cette zone/genre. 
                    Cela protège la confidentialité de chaque organisateur.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Risk Gauge + Price Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Risk Level */}
                <Card className={`border ${getRiskBg(analysis.risk_level)}`}>
                  <CardContent className="p-6 text-center">
                    <Thermometer className={`h-8 w-8 mx-auto mb-2 ${getRiskColor(analysis.risk_level)}`} />
                    <div className={`text-2xl font-bold ${getRiskColor(analysis.risk_level)}`}>
                      {analysis.risk_level === "Low" ? "Go" : analysis.risk_level === "Medium" ? "Prudence" : "Saturé"}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                      Niveau de risque
                    </div>
                  </CardContent>
                </Card>

                {/* Market Price */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{analysis.market_price_avg}€</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                      Prix moyen marché
                    </div>
                  </CardContent>
                </Card>

                {/* Recommended Price */}
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold text-green-500">{analysis.recommended_price}€</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                      Prix recommandé
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trend Chart */}
              {analysis.trend_data && analysis.trend_data.length > 0 && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Tendance des 6 derniers mois
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analysis.trend_data}>
                          <defs>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="mois" 
                            tick={{ fontSize: 11 }}
                            tickFormatter={(val) => val.slice(5)} // Show only MM
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
                              name === 'volume_billets' ? `${value} billets` : `${value}€`,
                              name === 'volume_billets' ? 'Volume' : 'Prix moyen'
                            ]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="volume_billets" 
                            stroke="hsl(var(--primary))" 
                            fillOpacity={1} 
                            fill="url(#colorVolume)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Advice */}
              <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Conseil IA</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {analysis.advice}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}