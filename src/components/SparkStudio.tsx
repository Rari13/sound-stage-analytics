import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Wand2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface SparkStudioProps {
  organizerId: string;
  isPremium: boolean;
}

const STYLES = [
  { value: "techno", label: "Techno / Industriel", gradient: "from-emerald-500 to-cyan-500" },
  { value: "rap", label: "Rap / Street Luxury", gradient: "from-amber-500 to-yellow-500" },
  { value: "classy", label: "Élégant / Gala", gradient: "from-zinc-400 to-zinc-600" },
  { value: "summer", label: "Summer / Open Air", gradient: "from-orange-500 to-pink-500" },
  { value: "afro", label: "Afro / Festival", gradient: "from-red-500 to-yellow-500" },
  { value: "electro", label: "Electro / Synthwave", gradient: "from-purple-500 to-pink-500" },
];

export function SparkStudio({ organizerId, isPremium }: SparkStudioProps) {
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [style, setStyle] = useState("techno");
  const [vibe, setVibe] = useState("");
  const [format, setFormat] = useState("post");
  
  // Text Overlay State
  const [eventTitle, setEventTitle] = useState("MON ÉVÉNEMENT");
  const [eventDate, setEventDate] = useState("SAMEDI 12 OCT");
  const [eventLineup, setEventLineup] = useState("DJ HEADLINER • GUEST");

  const flyerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flyer', {
        body: { style, vibe, format, organizerId }
      });

      if (error) throw new Error(error.message || "Erreur de génération");
      if (data?.error) throw new Error(data.error);
      
      setGeneratedImage(data.url);
      toast.success("Visuel généré ! Ajoutez vos textes.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    
    try {
      toast.info("Préparation du téléchargement...");
      const canvas = await html2canvas(flyerRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#000000',
      });

      const link = document.createElement('a');
      link.download = `spark-flyer-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast.success("Flyer téléchargé en HD !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const selectedStyle = STYLES.find(s => s.value === style);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
      {/* LEFT: CONTROL PANEL */}
      <div className="space-y-6 p-6 rounded-2xl bg-card/50 border border-border/50">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${selectedStyle?.gradient || 'from-purple-500 to-pink-500'} flex items-center justify-center`}>
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Spark Studio AI</h2>
            <p className="text-sm text-muted-foreground">
              Créez des visuels de classe mondiale en 30 secondes.
              {!isPremium && <span className="ml-2 text-amber-400"><Lock className="inline h-3 w-3 mr-1" />1 par jour</span>}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Style Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Style Artistique</label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-background/50 border-border">
                <SelectValue placeholder="Choisir un style" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full bg-gradient-to-br ${s.gradient}`} />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vibe Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Vibe & Détails (Optionnel)</label>
            <Input
              placeholder="Ex: Néons roses, fumée, ambiance warehouse..."
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="bg-background/50 border-border"
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('post')}
                className={`py-3 rounded-xl border transition-all ${
                  format === 'post' 
                    ? 'border-primary bg-primary/20 text-primary' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                Carré (Post)
              </button>
              <button
                onClick={() => setFormat('story')}
                className={`py-3 rounded-xl border transition-all ${
                  format === 'story' 
                    ? 'border-primary bg-primary/20 text-primary' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                Vertical (Story)
              </button>
            </div>
          </div>

          {/* Generate Button - Circuit Néon */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="neon-circuit-btn w-full h-16 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="circuit-content" />
            <div className="relative z-10 flex items-center justify-center gap-3 h-full">
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                  <span className="text-circuit">CALCUL EN COURS...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5 text-cyan-400" />
                  <span className="text-circuit">Générer le Visuel</span>
                </>
              )}
            </div>
          </button>

          {/* Text Customization (only visible when image generated) */}
          {generatedImage && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground">Personnalisation du Texte</h3>
              <Input 
                value={eventTitle} 
                onChange={(e) => setEventTitle(e.target.value)} 
                placeholder="Titre de l'événement"
                className="bg-background/50 font-bold"
              />
              <Input 
                value={eventDate} 
                onChange={(e) => setEventDate(e.target.value)} 
                placeholder="Date"
                className="bg-background/50"
              />
              <Input 
                value={eventLineup} 
                onChange={(e) => setEventLineup(e.target.value)} 
                placeholder="Line-up"
                className="bg-background/50"
              />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/30 border border-border/50">
        {!generatedImage ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-16">
            <div className={`h-24 w-24 rounded-2xl bg-gradient-to-br ${selectedStyle?.gradient || 'from-purple-500 to-pink-500'} flex items-center justify-center opacity-30`}>
              <Wand2 className="h-12 w-12 text-white" />
            </div>
            <p className="text-muted-foreground max-w-xs">
              Configurez votre style et lancez la génération pour voir le résultat ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {/* RENDER ZONE (This will be downloaded) */}
            <div 
              ref={flyerRef}
              className={`relative mx-auto overflow-hidden rounded-lg ${
                format === 'story' ? 'w-[270px] h-[480px]' : 'w-[320px] h-[320px]'
              }`}
            >
              {/* AI Background Image */}
              <img 
                src={generatedImage} 
                alt="Generated flyer background"
                className="absolute inset-0 w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              
              {/* Dark Gradient Overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

              {/* Text Overlays (Pro Style) */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 text-white">
                <p className="text-xs tracking-[0.3em] font-light opacity-80">{eventDate}</p>
                
                <div className="space-y-2">
                  <h1 
                    className="text-2xl font-black leading-tight tracking-tight"
                    style={{ 
                      textShadow: '0 2px 20px rgba(0,0,0,0.8)',
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {eventTitle.toUpperCase()}
                  </h1>
                  <p className="text-sm font-light tracking-wider opacity-90">{eventLineup}</p>
                </div>
                
                {/* Discreet Spark Branding */}
                <div className="flex items-center justify-center opacity-60">
                  <p className="text-[10px] tracking-widest">SPARK EVENTS</p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <Button onClick={handleDownload} className="w-full" variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Télécharger le Flyer HD
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
