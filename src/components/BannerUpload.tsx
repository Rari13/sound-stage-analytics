import { useState } from "react";
import { Upload, X, Image as ImageIcon, Sparkles, Wand2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface BannerUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  organizerId: string;
  description?: string;
}

const EVENT_TYPES = [
  { value: "concert", label: "Concert" },
  { value: "soiree", label: "Soirée / Clubbing" },
  { value: "festival", label: "Festival" },
  { value: "conference", label: "Conférence" },
  { value: "expo", label: "Exposition" },
  { value: "spectacle", label: "Spectacle" },
  { value: "sport", label: "Événement sportif" },
  { value: "autre", label: "Autre" },
];

const STYLES = [
  { value: "cyberpunk", label: "Cyberpunk / Néon" },
  { value: "minimalist", label: "Minimaliste" },
  { value: "vintage", label: "Vintage / Rétro" },
  { value: "abstract", label: "Abstrait" },
  { value: "urban", label: "Urbain / Street" },
  { value: "elegant", label: "Élégant / Luxe" },
  { value: "tropical", label: "Tropical / Coloré" },
  { value: "dark", label: "Sombre / Underground" },
];

const COLORS = [
  { value: "bleu-neon", label: "Bleu néon", color: "#00D4FF" },
  { value: "rose-violet", label: "Rose & Violet", color: "#FF00FF" },
  { value: "orange-rouge", label: "Orange & Rouge", color: "#FF5500" },
  { value: "vert-nature", label: "Vert nature", color: "#00FF88" },
  { value: "or-noir", label: "Or & Noir", color: "#FFD700" },
  { value: "pastel", label: "Pastel doux", color: "#FFB6C1" },
  { value: "monochrome", label: "Noir & Blanc", color: "#888888" },
];

export function BannerUpload({ value, onChange, organizerId, description }: BannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [customPrompt, setCustomPrompt] = useState(""); 
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  // Guided form state
  const [eventType, setEventType] = useState("");
  const [style, setStyle] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [elements, setElements] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux (Max 3Mo)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizerId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('event-banners')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-banners')
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      onChange(publicUrl);
      toast({ title: "Image importée avec succès" });
    } catch (error: any) {
      toast({ title: "Erreur d'upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

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

  const toggleColor = (colorValue: string) => {
    setSelectedColors(prev => 
      prev.includes(colorValue) 
        ? prev.filter(c => c !== colorValue)
        : prev.length < 3 ? [...prev, colorValue] : prev
    );
  };

  const buildPrompt = () => {
    const parts: string[] = [];
    
    const eventLabel = EVENT_TYPES.find(e => e.value === eventType)?.label;
    if (eventLabel) parts.push(`Event flyer for a ${eventLabel}`);
    
    const styleLabel = STYLES.find(s => s.value === style)?.label;
    if (styleLabel) parts.push(`${styleLabel} style`);
    
    if (selectedColors.length > 0) {
      const colorLabels = selectedColors.map(c => COLORS.find(col => col.value === c)?.label).filter(Boolean);
      parts.push(`color scheme: ${colorLabels.join(', ')}`);
    }
    
    if (elements) parts.push(`with elements: ${elements}`);
    if (customPrompt) parts.push(customPrompt);

    return parts.join('. ');
  };

  const handleGenerate = async () => {
    const prompt = buildPrompt();
    
    if (!eventType && !style && !customPrompt) {
      toast({
        title: "Guidez l'IA",
        description: "Sélectionnez au moins un type d'événement ou un style.",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
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
        body: { prompt, organizerId, logoBase64 }
      });

      if (error) throw error;

      if (data.url) {
        setPreview(data.url);
        onChange(data.url);
        toast({
          title: "Flyer généré !",
          description: "L'image a été créée par l'IA.",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erreur de génération",
        description: error.message || "Réessayez dans quelques instants.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative aspect-video rounded-xl overflow-hidden border border-border group bg-muted">
          <img 
            src={preview} 
            alt="Bannière" 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              className="rounded-full"
            >
              <X className="h-4 w-4 mr-2" />
              Supprimer / Changer
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              Créer via IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="animate-fade-in">
            <label className="cursor-pointer group">
              <div className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3">
                {uploading ? (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Upload en cours...</p>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-muted group-hover:scale-110 transition-transform flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">Cliquez pour importer</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP • Max 3Mo</p>
                    </div>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 animate-fade-in">
            <div className="p-5 border rounded-xl bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-100 dark:border-purple-800/50">
              <div className="flex gap-2 mb-4 items-center">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-sm">Studio de Création IA</h4>
              </div>

              {/* Event Type */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Type d'événement</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="bg-background/80">
                    <SelectValue placeholder="Sélectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Style */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Style visuel</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-background/80">
                    <SelectValue placeholder="Sélectionnez un style..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Colors */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Couleurs (max 3)</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <Badge
                      key={color.value}
                      variant={selectedColors.includes(color.value) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      style={{ 
                        borderColor: color.color,
                        backgroundColor: selectedColors.includes(color.value) ? color.color : 'transparent',
                        color: selectedColors.includes(color.value) ? '#fff' : 'inherit'
                      }}
                      onClick={() => toggleColor(color.value)}
                    >
                      {color.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Elements */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Éléments visuels (optionnel)</Label>
                <Textarea 
                  value={elements}
                  onChange={(e) => setElements(e.target.value)}
                  placeholder="Ex: foule en silhouette, DJ, enceintes, confettis..."
                  className="bg-background/80 min-h-[60px] resize-none text-sm"
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Votre logo (optionnel)</Label>
                {logoPreview ? (
                  <div className="flex items-center gap-3 p-3 bg-background/80 rounded-lg border">
                    <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain rounded" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Logo importé</p>
                      <p className="text-xs text-muted-foreground">Sera intégré au flyer</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={removeLogo}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-3 p-3 bg-background/80 rounded-lg border border-dashed hover:border-purple-400 transition-colors">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ajouter votre logo</p>
                        <p className="text-xs text-muted-foreground">L'IA l'intégrera au design</p>
                      </div>
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

              {/* Custom prompt */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Instructions supplémentaires</Label>
                <Textarea 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ajoutez des détails spécifiques..."
                  className="bg-background/80 min-h-[60px] resize-none text-sm"
                />
              </div>
              
              <Button 
                type="button" 
                onClick={handleGenerate} 
                disabled={generating}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 border-0 h-11"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    L'IA travaille...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 fill-white/20" />
                    Générer mon flyer
                  </>
                )}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-3">
                Propulsé par Lovable AI • Génération unique
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
