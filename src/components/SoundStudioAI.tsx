import { useState } from "react";
import { Sparkles, Send, Loader2, RotateCcw, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SoundStudioAIProps {
  onComplete: (imageUrl: string) => void;
  organizerId: string;
}

interface Message {
  role: "ai" | "user";
  content: string;
  showStyles?: boolean;
}

const MAX_EXCHANGES = 3;

// Visual style examples with preview colors/gradients
const STYLE_EXAMPLES = [
  { 
    id: "neon", 
    label: "Néon / Cyberpunk",
    gradient: "from-purple-600 via-pink-500 to-cyan-400",
    description: "Couleurs électriques, ambiance club futuriste"
  },
  { 
    id: "luxury", 
    label: "Luxe / Gold",
    gradient: "from-amber-300 via-yellow-500 to-amber-700",
    description: "Or, champagne, marbre noir"
  },
  { 
    id: "retro", 
    label: "Rétro / Y2K",
    gradient: "from-pink-400 via-fuchsia-500 to-cyan-300",
    description: "Chrome, rose-cyan, nostalgie 2000"
  },
  { 
    id: "underground", 
    label: "Underground / Techno",
    gradient: "from-gray-900 via-zinc-800 to-neutral-900",
    description: "Sombre, industriel, béton"
  },
  { 
    id: "summer", 
    label: "Summer / Festival",
    gradient: "from-orange-400 via-red-400 to-pink-500",
    description: "Coucher de soleil, plage, tropical"
  },
  { 
    id: "minimal", 
    label: "Minimaliste",
    gradient: "from-slate-100 via-gray-200 to-slate-300",
    description: "Épuré, typographie forte, espace"
  },
];

export function SoundStudioAI({ onComplete, organizerId }: SoundStudioAIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "Salut ! 👋 Je suis ton assistant créatif Sound Studio. Commence par choisir un style qui t'inspire, ou décris-moi directement ta vision !",
      showStyles: true
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [exchangeCount, setExchangeCount] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: "Format invalide",
        description: "Seuls JPG, PNG et WEBP sont acceptés",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Logo trop volumineux (Max 2Mo)", variant: "destructive" });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const selectStyle = (styleId: string) => {
    const style = STYLE_EXAMPLES.find(s => s.id === styleId);
    if (!style) return;
    
    const userMessage = `Je veux un style ${style.label} - ${style.description}`;
    setUserInput(userMessage);
    
    // Auto-send after selecting
    setTimeout(() => {
      sendMessageWithContent(userMessage);
    }, 100);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isThinking) return;
    await sendMessageWithContent(userInput);
  };

  const sendMessageWithContent = async (content: string) => {
    const newUserMessage: Message = { role: "user", content };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setIsThinking(true);

    try {
      // Call AI to understand and refine
      const { data, error } = await supabase.functions.invoke('generate-flyer', {
        body: { 
          action: "refine",
          messages: updatedMessages.map(m => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content
          })),
          exchangeCount: exchangeCount + 1,
          maxExchanges: MAX_EXCHANGES
        }
      });

      if (error) throw error;

      const newExchangeCount = exchangeCount + 1;
      setExchangeCount(newExchangeCount);

      if (data.ready || newExchangeCount >= MAX_EXCHANGES) {
        // AI is ready to generate
        setMessages(prev => [...prev, {
          role: "ai",
          content: data.message || "Parfait ! J'ai tout compris. Je génère ton affiche maintenant... 🎨"
        }]);
        
        // Trigger generation
        await generateFlyer(data.finalPrompt || buildConversationContext(updatedMessages));
      } else {
        // AI needs more info
        setMessages(prev => [...prev, {
          role: "ai",
          content: data.message
        }]);
      }
    } catch (error: any) {
      console.error("AI error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de communiquer avec l'IA",
        variant: "destructive"
      });
    } finally {
      setIsThinking(false);
    }
  };

  const buildConversationContext = (msgs: Message[]) => {
    return msgs
      .filter(m => m.role === "user")
      .map(m => m.content)
      .join(". ");
  };

  const generateFlyer = async (prompt: string) => {
    setIsGenerating(true);
    
    try {
      let logoBase64: string | null = null;
      
      if (logoFile) {
        const reader = new FileReader();
        logoBase64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(logoFile);
        });
      }

      const { data, error } = await supabase.functions.invoke('generate-flyer', {
        body: { 
          action: "generate",
          prompt, 
          organizerId, 
          logoBase64 
        }
      });

      if (error) throw error;

      if (data.imageBase64) {
        const previewUrl = `data:image/png;base64,${data.imageBase64}`;
        setGeneratedPreview(previewUrl);
        
        // Upload to storage
        const blob = await fetch(previewUrl).then(r => r.blob());
        const fileName = `${organizerId}/${Date.now()}.png`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('event-banners')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-banners')
          .getPublicUrl(uploadData.path);

        setMessages(prev => [...prev, {
          role: "ai",
          content: "Voilà ton affiche ! 🎉 Si elle te plaît, clique sur 'Utiliser'. Sinon, on peut recommencer."
        }]);

        // Store final URL for confirmation
        setGeneratedPreview(publicUrl);
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Erreur de génération",
        description: error.message || "Réessayez dans quelques instants.",
        variant: "destructive"
      });
      setMessages(prev => [...prev, {
        role: "ai",
        content: "Oups, j'ai eu un souci technique. On peut réessayer ?"
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetConversation = () => {
    setMessages([{
      role: "ai",
      content: "Salut ! 👋 Je suis ton assistant créatif Sound Studio. Commence par choisir un style qui t'inspire, ou décris-moi directement ta vision !",
      showStyles: true
    }]);
    setExchangeCount(0);
    setGeneratedPreview(null);
  };

  const confirmImage = () => {
    if (generatedPreview) {
      onComplete(generatedPreview);
    }
  };

  return (
    <div className="rounded-xl border bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-100 dark:border-purple-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-100 dark:border-purple-800/50 bg-white/50 dark:bg-black/20">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Sound Studio AI</h4>
            <p className="text-[10px] text-muted-foreground">Échange {exchangeCount}/{MAX_EXCHANGES}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={resetConversation} className="text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />
          Recommencer
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className="space-y-2">
            <div
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-white dark:bg-gray-800 shadow-sm border rounded-bl-md"
                )}
              >
                {msg.content}
              </div>
            </div>
            
            {/* Style Examples Grid */}
            {msg.showStyles && msg.role === "ai" && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {STYLE_EXAMPLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => selectStyle(style.id)}
                    className="group relative overflow-hidden rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-90",
                      style.gradient
                    )} />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative z-10">
                      <p className="font-semibold text-white text-xs drop-shadow-md">{style.label}</p>
                      <p className="text-[10px] text-white/80 mt-0.5 line-clamp-1">{style.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 shadow-sm border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 shadow-sm border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
              <span className="text-sm text-muted-foreground">Génération en cours...</span>
            </div>
          </div>
        )}
      </div>

      {/* Generated Preview */}
      {generatedPreview && (
        <div className="px-4 pb-4">
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-purple-200 dark:border-purple-700">
            <img src={generatedPreview} alt="Aperçu" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button 
              onClick={confirmImage} 
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Utiliser cette image
            </Button>
            <Button variant="outline" onClick={resetConversation} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Recommencer
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!generatedPreview && !isGenerating && (
        <div className="p-4 border-t border-purple-100 dark:border-purple-800/50 bg-white/30 dark:bg-black/10">
          {/* Logo Upload */}
          <div className="mb-3">
            {logoPreview ? (
              <div className="flex items-center gap-2 p-2 bg-background rounded-lg border text-xs">
                <img src={logoPreview} alt="Logo" className="h-8 w-8 object-contain rounded" />
                <span className="flex-1 text-muted-foreground">Logo ajouté</span>
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 p-2 bg-background/80 rounded-lg border border-dashed hover:border-purple-400 transition-colors text-xs">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ajouter mon logo (optionnel)</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                />
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Décris ton événement et l'ambiance souhaitée..."
              className="min-h-[44px] max-h-[100px] resize-none bg-background text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={!userInput.trim() || isThinking}
              className="h-11 w-11 p-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Propulsé par Nano Banana AI
          </p>
        </div>
      )}
    </div>
  );
}
