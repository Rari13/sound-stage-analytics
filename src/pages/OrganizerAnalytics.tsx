import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, Users, MousePointerClick, Loader2, TrendingUp, Sparkles, 
  BarChart3, Send, MessageCircle, Zap, Wand2, Target, Euro, 
  Calendar, ArrowUpRight, ArrowDownRight, ChevronRight, Activity
} from "lucide-react";
import { DataImporter } from "@/components/DataImporter";
import { MarketIntelligence } from "@/components/MarketIntelligence";
import { DemandPrediction } from "@/components/DemandPrediction";
import { EventSimulator } from "@/components/EventSimulator";
import { YieldManagement } from "@/components/YieldManagement";
import { PremiumGate } from "@/components/PremiumGate";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SwipeChartData {
  name: string;
  likes: number;
  dislikes: number;
  eventId: string;
  ratio: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  starts_at: string;
  ticketsSold: number;
  capacity: number | null;
  revenue: number;
}

type ActiveTool = "yield" | "simulator" | "prediction" | "market" | "data" | "chat" | null;

export default function OrganizerAnalytics() {
  const { user } = useAuth();
  const { isPremium, organizerId, loading: subscriptionLoading } = useSubscription();
  const [aiLoading, setAiLoading] = useState(false);
  const [audienceStats, setAudienceStats] = useState({ 
    followers: 0, 
    likes: 0, 
    conversionRate: 0,
    totalRevenue: 0,
    ticketsSold: 0,
    avgTicketPrice: 0
  });
  const [swipeChartData, setSwipeChartData] = useState<SwipeChartData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState("");
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (organizerId) {
      fetchStats();
      fetchUpcomingEvents();
    }
  }, [organizerId]);

  const fetchUpcomingEvents = async () => {
    if (!organizerId) return;

    const { data: events } = await supabase
      .from("events")
      .select("id, title, starts_at, capacity")
      .eq("organizer_id", organizerId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5);

    if (events) {
      const eventsWithStats = await Promise.all(events.map(async (event) => {
        const { count: ticketCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        const { data: orders } = await supabase
          .from("orders")
          .select("amount_total_cents")
          .eq("event_id", event.id)
          .eq("status", "completed");

        const revenue = orders?.reduce((sum, o) => sum + o.amount_total_cents, 0) || 0;

        return {
          ...event,
          ticketsSold: ticketCount || 0,
          revenue: revenue / 100
        };
      }));

      setUpcomingEvents(eventsWithStats);
    }
  };

  const fetchStats = async () => {
    if (!organizerId) return;

    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", organizerId);

    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .eq("organizer_id", organizerId)
      .order("starts_at", { ascending: false })
      .limit(10);

    let likes = 0;
    let totalSwipes = 0;
    let ticketsSold = 0;
    let totalRevenue = 0;
    const chartData: SwipeChartData[] = [];

    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);
      
      const { data: swipes } = await supabase
        .from("swipes")
        .select("direction, event_id")
        .in("event_id", eventIds);

      if (swipes) {
        likes = swipes.filter(s => s.direction === 'right').length;
        totalSwipes = swipes.length;

        events.forEach(event => {
          const eventSwipes = swipes.filter(s => s.event_id === event.id);
          const eventLikes = eventSwipes.filter(s => s.direction === 'right').length;
          const eventDislikes = eventSwipes.filter(s => s.direction === 'left').length;
          const total = eventLikes + eventDislikes;
          
          if (eventLikes > 0 || eventDislikes > 0) {
            chartData.push({
              name: event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title,
              likes: eventLikes,
              dislikes: eventDislikes,
              eventId: event.id,
              ratio: total > 0 ? Math.round((eventLikes / total) * 100) : 0
            });
          }
        });
      }

      const { count: ticketsCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds);
      
      ticketsSold = ticketsCount || 0;

      const { data: orders } = await supabase
        .from("orders")
        .select("amount_total_cents")
        .in("event_id", eventIds)
        .eq("status", "completed");

      totalRevenue = orders?.reduce((sum, o) => sum + o.amount_total_cents, 0) || 0;
    }

    const conversionRate = likes > 0 ? Math.round((ticketsSold / likes) * 100) : 0;
    const avgTicketPrice = ticketsSold > 0 ? totalRevenue / ticketsSold / 100 : 0;

    setAudienceStats({
      followers: followersCount || 0,
      likes,
      conversionRate,
      totalRevenue: totalRevenue / 100,
      ticketsSold,
      avgTicketPrice
    });
    setSwipeChartData(chartData.sort((a, b) => b.ratio - a.ratio));
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleQuickAction = async (type: string) => {
    const prompts: Record<string, string> = {
      "general-insights": "Analyse mes performances globales et donne-moi 3 actions concrètes à mettre en place cette semaine.",
      "demand-supply-analysis": "Compare l'offre de mes événements avec la demande. Quels créneaux ou styles sont sous-exploités ?",
      "pricing-advice": "Analyse mes prix actuels. Sont-ils optimaux par rapport au marché ?",
      "audience-growth": "Comment puis-je augmenter mon nombre d'abonnés rapidement ?"
    };
    const question = prompts[type] || "";
    if (question) {
      setActiveTool("chat");
      await handleSendQuestion(question);
    }
  };

  const handleSendQuestion = async (question?: string) => {
    const messageToSend = question || userQuestion.trim();
    if (!messageToSend || !isPremium) {
      if (!isPremium) toast.error("Fonctionnalité Premium requise");
      return;
    }

    const newUserMessage: ChatMessage = { role: "user", content: messageToSend };
    setChatMessages(prev => [...prev, newUserMessage]);
    setUserQuestion("");
    setAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-analytics", {
        body: { 
          type: "custom-question", 
          organizerId, 
          question: messageToSend,
          conversationHistory: chatMessages 
        },
      });
      if (error) throw error;
      
      const assistantMessage: ChatMessage = { role: "assistant", content: data.analysis };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse IA");
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setAiLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (!isPremium) {
    return <PremiumGate feature="analytics" />;
  }

  const tools = [
    { id: "yield" as const, label: "Prix dynamique", icon: TrendingUp, description: "Optimisez vos prix en temps réel", color: "text-green-500" },
    { id: "simulator" as const, label: "Simulateur", icon: Wand2, description: "Testez un événement avant de le créer", color: "text-purple-500" },
    { id: "prediction" as const, label: "Prédiction", icon: Zap, description: "Anticipez la demande", color: "text-amber-500" },
    { id: "market" as const, label: "Marché", icon: Activity, description: "Analysez votre marché local", color: "text-blue-500" },
    { id: "data" as const, label: "Import", icon: BarChart3, description: "Importez vos données historiques", color: "text-slate-500" },
  ];

  const quickActions = [
    { id: "general-insights", label: "Actions de la semaine", icon: Target },
    { id: "pricing-advice", label: "Analyse des prix", icon: Euro },
    { id: "audience-growth", label: "Croissance audience", icon: Users },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Intelligence</h1>
          <p className="text-sm text-muted-foreground">Pilotez votre activité avec l'IA</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
          <Sparkles className="h-3 w-3 mr-1" />
          Premium
        </Badge>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold">{audienceStats.followers}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Abonnés</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-3 text-center">
            <MousePointerClick className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{audienceStats.conversionRate}%</div>
            <div className="text-[9px] text-muted-foreground uppercase">Conversion</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-3 text-center">
            <Target className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{audienceStats.ticketsSold}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Billets</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-3 text-center">
            <Euro className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{audienceStats.totalRevenue.toLocaleString('fr-FR')}€</div>
            <div className="text-[9px] text-muted-foreground uppercase">CA Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            onClick={() => handleQuickAction(action.id)}
            disabled={aiLoading}
            variant="outline"
            size="sm"
            className="shrink-0 text-xs gap-1.5"
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Upcoming Events Performance */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Événements à venir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.slice(0, 3).map((event) => {
              const fillRate = event.capacity ? Math.round((event.ticketsSold / event.capacity) * 100) : 0;
              const isGoodFill = fillRate >= 50;
              return (
                <div key={event.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.starts_at), "d MMM", { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-semibold">{event.ticketsSold} billets</p>
                      <p className="text-xs text-muted-foreground">{event.revenue.toLocaleString('fr-FR')}€</p>
                    </div>
                    {event.capacity && (
                      <Badge variant={isGoodFill ? "default" : "secondary"} className="text-xs">
                        {isGoodFill ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {fillRate}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tools Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Outils d'analyse</h2>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-3 rounded-xl border text-left transition-all hover:shadow-md ${
                activeTool === tool.id 
                  ? "border-primary bg-primary/5 shadow-sm" 
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <tool.icon className={`h-4 w-4 ${tool.color}`} />
                <span className="text-sm font-medium">{tool.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{tool.description}</p>
            </button>
          ))}
          <button
            onClick={() => setActiveTool("chat")}
            className={`p-3 rounded-xl border text-left transition-all hover:shadow-md ${
              activeTool === "chat" 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Assistant IA</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">Posez vos questions</p>
          </button>
        </div>
      </div>

      {/* Active Tool Content */}
      {activeTool && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {activeTool === "chat" && <MessageCircle className="h-4 w-4 text-primary" />}
              {activeTool === "yield" && <TrendingUp className="h-4 w-4 text-green-500" />}
              {activeTool === "simulator" && <Wand2 className="h-4 w-4 text-purple-500" />}
              {activeTool === "prediction" && <Zap className="h-4 w-4 text-amber-500" />}
              {activeTool === "market" && <Activity className="h-4 w-4 text-blue-500" />}
              {activeTool === "data" && <BarChart3 className="h-4 w-4 text-slate-500" />}
              {tools.find(t => t.id === activeTool)?.label || "Assistant IA"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActiveTool(null)}>
              Fermer
            </Button>
          </CardHeader>
          <CardContent>
            {activeTool === "chat" && (
              <div className="space-y-3">
                <ScrollArea className="h-[250px] pr-3">
                  <div className="space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Posez une question sur votre activité</p>
                        <p className="text-xs mt-1 text-muted-foreground/70">
                          "Pourquoi mes ventes ont baissé ?"
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Analyse...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Votre question..."
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    disabled={aiLoading}
                    className="min-h-[40px] max-h-[80px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendQuestion();
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleSendQuestion()}
                    disabled={aiLoading || !userQuestion.trim()}
                    size="icon"
                    className="shrink-0 h-10 w-10"
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            {activeTool === "yield" && <YieldManagement organizerId={organizerId || ""} />}
            {activeTool === "simulator" && <EventSimulator organizerId={organizerId || ""} />}
            {activeTool === "prediction" && <DemandPrediction organizerId={organizerId || ""} />}
            {activeTool === "market" && <MarketIntelligence organizerId={organizerId || ""} />}
            {activeTool === "data" && <DataImporter organizerId={organizerId || ""} />}
          </CardContent>
        </Card>
      )}

      {/* Engagement Chart - Collapsible */}
      {swipeChartData.length > 0 && !activeTool && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Engagement par événement
            </CardTitle>
            <CardDescription className="text-xs">Taux d'intérêt sur vos événements récents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {swipeChartData.slice(0, 5).map((event, idx) => (
                <div key={event.eventId} className="flex items-center gap-3">
                  <div className="w-24 truncate text-xs text-muted-foreground">{event.name}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                      style={{ width: `${event.ratio}%` }}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className={`text-xs font-medium ${event.ratio >= 60 ? 'text-green-500' : event.ratio >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                      {event.ratio}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
