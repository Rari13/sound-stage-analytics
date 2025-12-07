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
      {/* Header - Compact for mobile */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-purple-100 dark:border-purple-800/50 bg-white/50 dark:bg-black/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-xs">Sound Studio AI</h4>
            <p className="text-[9px] text-muted-foreground">{exchangeCount}/{MAX_EXCHANGES}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={resetConversation} className="text-[10px] h-7 px-2">
          <RotateCcw className="h-3 w-3 mr-1" />
          Recommencer
        </Button>
      </div>

      {/* Chat Messages - Compact */}
      <div className="px-3 py-2 space-y-2 max-h-[200px] overflow-y-auto">
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
                  "max-w-[90%] rounded-xl px-3 py-2 text-xs",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-white dark:bg-gray-800 shadow-sm border rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
            
            {/* Style Examples Grid - 3 columns on mobile */}
            {msg.showStyles && msg.role === "ai" && (
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {STYLE_EXAMPLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => selectStyle(style.id)}
                    className="group relative overflow-hidden rounded-lg p-2 text-left transition-all active:scale-[0.96]"
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-90",
                      style.gradient
                    )} />
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative z-10">
                      <p className="font-medium text-white text-[10px] leading-tight drop-shadow-md line-clamp-2">{style.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 shadow-sm border rounded-xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 shadow-sm border rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
              <span className="text-xs text-muted-foreground">Génération...</span>
            </div>
          </div>
        )}
      </div>

      {/* Generated Preview - Compact */}
      {generatedPreview && (
        <div className="px-3 pb-3">
          <div className="relative aspect-[4/5] rounded-lg overflow-hidden border border-purple-200 dark:border-purple-700">
            <img src={generatedPreview} alt="Aperçu" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={confirmImage} 
              size="sm"
              className="flex-1 h-9 text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              <Check className="h-3 w-3 mr-1" />
              Utiliser
            </Button>
            <Button variant="outline" size="sm" onClick={resetConversation} className="flex-1 h-9 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              Refaire
            </Button>
          </div>
        </div>
      )}

      {/* Input Area - Compact */}
      {!generatedPreview && !isGenerating && (
        <div className="px-3 py-2 border-t border-purple-100 dark:border-purple-800/50 bg-white/30 dark:bg-black/10">
          {/* Logo Upload - Inline compact */}
          <div className="mb-2">
            {logoPreview ? (
              <div className="flex items-center gap-2 p-1.5 bg-background rounded-lg border text-[10px]">
                <img src={logoPreview} alt="Logo" className="h-6 w-6 object-contain rounded" />
                <span className="flex-1 text-muted-foreground truncate">Logo ajouté</span>
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo} className="h-5 w-5 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="flex items-center justify-center gap-1.5 p-1.5 bg-background/80 rounded-lg border border-dashed hover:border-purple-400 transition-colors text-[10px]">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Ajouter mon logo</span>
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

          <div className="flex gap-1.5">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Décris ton événement..."
              className="min-h-[36px] max-h-[60px] resize-none bg-background text-xs py-2"
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
              className="h-9 w-9 p-0 shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <p className="text-[8px] text-center text-muted-foreground mt-1.5 opacity-60">
            Propulsé par Nano Banana AI
          </p>
        </div>
      )}
    </div>
  );
}
