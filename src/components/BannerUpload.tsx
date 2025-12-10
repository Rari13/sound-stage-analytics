import { useState } from "react";
import { Upload, X, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoundStudioAI } from "./SoundStudioAI";

interface BannerUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  organizerId: string;
  description?: string;
}

export function BannerUpload({ value, onChange, organizerId, description }: BannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
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

    if (file.size > 6 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux (Max 6Mo)", variant: "destructive" });
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

  const handleAIComplete = (imageUrl: string) => {
    setPreview(imageUrl);
    onChange(imageUrl);
    toast({
      title: "Flyer généré !",
      description: "L'image a été créée par Sound Studio AI.",
    });
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
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP • Max 6Mo</p>
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

          <TabsContent value="ai" className="animate-fade-in">
            <SoundStudioAI 
              organizerId={organizerId} 
              onComplete={handleAIComplete} 
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
