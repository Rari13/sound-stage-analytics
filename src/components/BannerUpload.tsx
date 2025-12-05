import { useState } from "react";
import { Upload, X, Image as ImageIcon, Sparkles, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface BannerUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  organizerId: string;
  description?: string;
}

export function BannerUpload({ value, onChange, organizerId, description }: BannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [prompt, setPrompt] = useState(description || ""); 
  const { toast } = useToast();

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

  const handleGenerate = async () => {
    if (!prompt || prompt.length < 10) {
      toast({
        title: "Description trop courte",
        description: "Décrivez l'ambiance pour aider l'IA (min 10 caractères).",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flyer', {
        body: { prompt, organizerId }
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
        description: error.message || "L'IA est capricieuse, réessayez.",
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
              <div className="flex gap-2 mb-3 items-center">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-sm">Studio de Création</h4>
              </div>
              
              <Textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez votre flyer : 'Affiche festival électro, néons bleus et roses, foule en silhouette, style cyberpunk moderne...'"
                className="mb-4 bg-background/80 min-h-[100px] resize-none border-purple-200/50 focus:border-purple-400"
              />
              
              <Button 
                type="button" 
                onClick={handleGenerate} 
                disabled={generating || !prompt}
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
