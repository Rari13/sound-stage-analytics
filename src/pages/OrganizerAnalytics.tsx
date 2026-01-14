import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Users, MousePointerClick, Loader2, TrendingUp, Sparkles, BarChart3, Send, MessageCircle, Zap, Wand2 } from "lucide-react";
import { DataImporter } from "@/components/DataImporter";
import { MarketIntelligence } from "@/components/MarketIntelligence";
import { DemandPrediction } from "@/components/DemandPrediction";
import { EventSimulator } from "@/components/EventSimulator";
import { PremiumGate } from "@/components/PremiumGate";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SwipeChartData {
  name: string;
  likes: number;
  dislikes: number;
  eventId: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function OrganizerAnalytics() {
  const { user } = useAuth();
  const { isPremium, organizerId, loading: subscriptionLoading } = useSubscription();
  const [aiLoading, setAiLoading] = useState(false);
  const [audienceStats, setAudienceStats] = useState({ followers: 0, likes: 0, conversionRate: 0 });
  const [swipeChartData, setSwipeChartData] = useState<SwipeChartData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (organizerId) {
      fetchStats();
    }
  }, [organizerId]);

  const fetchStats = async () => {
    if (!organizerId) return;

    // Get followers count
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", organizerId);

    // Get organizer's events to fetch swipe stats
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .eq("organizer_id", organizerId)
      .order("starts_at", { ascending: false })
      .limit(10);

    let likes = 0;
    let totalSwipes = 0;
    let ticketsSold = 0;
    const chartData: SwipeChartData[] = [];

    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);
      
      // Get swipes for all events
      const { data: swipes } = await supabase
        .from("swipes")
        .select("direction, event_id")
        .in("event_id", eventIds);

      if (swipes) {
        likes = swipes.filter(s => s.direction === 'right').length;
        totalSwipes = swipes.length;

        // Build chart data per event
        events.forEach(event => {
          const eventSwipes = swipes.filter(s => s.event_id === event.id);
          const eventLikes = eventSwipes.filter(s => s.direction === 'right').length;
          const eventDislikes = eventSwipes.filter(s => s.direction === 'left').length;
          
          if (eventLikes > 0 || eventDislikes > 0) {
            chartData.push({
              name: event.title.length > 12 ? event.title.substring(0, 12) + '...' : event.title,
              likes: eventLikes,
              dislikes: eventDislikes,
              eventId: event.id
            });
          }
        });
      }

      // Get tickets sold
      const { count: ticketsCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds);
      
      ticketsSold = ticketsCount || 0;
    }

    const conversionRate = likes > 0 ? Math.round((ticketsSold / likes) * 100) : 0;

    setAudienceStats({
      followers: followersCount || 0,
      likes,
      conversionRate
    });
    setSwipeChartData(chartData);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleQuickAction = async (type: string) => {
    const prompts: Record<string, string> = {
      "general-insights": "Analyse mes performances globales et donne-moi des conseils stratégiques.",
      "demand-supply-analysis": "Compare l'offre de mes événements avec la demande réelle des utilisateurs."
    };
    const question = prompts[type] || "";
    if (question) {
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
      setChatMessages(prev => prev.slice(0, -1)); // Remove the user message on error
    } finally {
      setAiLoading(false);
    }
  };

  // Show loading state
  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  // Gate behind premium
  if (!isPremium) {
    return <PremiumGate feature="analytics" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Intelligence</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium text-accent">Premium</span>
        </div>
      </div>

      {/* KPIs Audience */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{audienceStats.followers}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Abonnés
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <MousePointerClick className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{audienceStats.conversionRate}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Conv.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swipes Chart */}
      {swipeChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Engagement par événement
            </CardTitle>
            <CardDescription>Likes vs Dislikes sur vos événements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={swipeChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80} 
                    tick={{ fontSize: 10 }} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'likes' ? '❤️ Likes' : '❌ Dislikes'
                    ]}
                  />
                  <Legend 
                    formatter={(value) => value === 'likes' ? 'Likes' : 'Dislikes'}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="likes" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="likes" />
                  <Bar dataKey="dislikes" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="dislikes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Chat Interface */}
      <Card className="border-primary/30 bg-gradient-to-br from-background to-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-5">
          <Brain className="h-24 w-24" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            Assistant Intelligence
          </CardTitle>
          <CardDescription>
            Posez vos questions sur votre audience et stratégie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleQuickAction("general-insights")}
              disabled={aiLoading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              Performance
            </Button>
            <Button
              onClick={() => handleQuickAction("demand-supply-analysis")}
              disabled={aiLoading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <BarChart3 className="mr-1 h-3 w-3" />
              Offre vs Demande
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="bg-background/60 backdrop-blur rounded-xl border min-h-[150px] max-h-[300px] overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Posez une question ou utilisez les boutons rapides</p>
                <p className="text-xs mt-1">Ex: "Pourquoi mes ventes ont baissé ce mois-ci ?"</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
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
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Analyse en cours...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Posez votre question..."
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              disabled={aiLoading}
              className="min-h-[44px] max-h-[100px] resize-none"
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
              className="shrink-0 h-[44px] w-[44px]"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="simulator" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="simulator" className="flex items-center gap-1">
            <Wand2 className="h-3 w-3" />
            Simulateur
          </TabsTrigger>
          <TabsTrigger value="prediction" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Prédiction
          </TabsTrigger>
          <TabsTrigger value="market">Marché</TabsTrigger>
          <TabsTrigger value="data">Données</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="mt-4">
          <EventSimulator organizerId={organizerId || ""} />
        </TabsContent>

        <TabsContent value="prediction" className="mt-4">
          <DemandPrediction organizerId={organizerId || ""} />
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <MarketIntelligence organizerId={organizerId || ""} />
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <DataImporter organizerId={organizerId || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
