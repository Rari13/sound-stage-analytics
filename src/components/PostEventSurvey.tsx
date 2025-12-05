import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CloudRain, Sun, Cloud, CalendarDays, GraduationCap, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostEventSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  event: { id: string; title: string };
}

export function PostEventSurvey({ isOpen, onClose, event }: PostEventSurveyProps) {
  const [weather, setWeather] = useState<string>("");
  const [context, setContext] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const markSurveyCompleted = async (surveyData?: { weather: string; context_tags: string[] }) => {
    const updateData: Record<string, unknown> = {
      survey_completed_at: new Date().toISOString()
    };
    
    // If survey was filled, store the data in short_description (JSON format)
    if (surveyData) {
      updateData.short_description = JSON.stringify(surveyData);
    }

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', event.id);

    return { error };
  };

  const handleSubmit = async () => {
    if (!weather) {
      toast.error("Veuillez indiquer la météo");
      return;
    }

    setSubmitting(true);
    
    const { error } = await markSurveyCompleted({ weather, context_tags: context });

    if (error) {
      toast.error("Erreur lors de l'enregistrement");
    } else {
      toast.success("Merci ! Ces données affineront vos futures prédictions IA.");
      onClose();
    }
    setSubmitting(false);
  };

  const handleDismiss = async () => {
    // Mark as completed even if user skips, so it won't show again
    await markSurveyCompleted();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bilan : {event.title}</DialogTitle>
          <DialogDescription>
            Aidez l'IA à mieux comprendre vos résultats en donnant du contexte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Quel temps faisait-il ?</Label>
            <RadioGroup value={weather} onValueChange={setWeather} className="grid grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="sunny" id="sunny" className="peer sr-only" />
                <Label
                  htmlFor="sunny"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Sun className="mb-2 h-6 w-6 text-orange-500" />
                  Soleil
                </Label>
              </div>
              <div>
                <RadioGroupItem value="cloudy" id="cloudy" className="peer sr-only" />
                <Label
                  htmlFor="cloudy"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Cloud className="mb-2 h-6 w-6 text-gray-500" />
                  Nuageux
                </Label>
              </div>
              <div>
                <RadioGroupItem value="rainy" id="rainy" className="peer sr-only" />
                <Label
                  htmlFor="rainy"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <CloudRain className="mb-2 h-6 w-6 text-blue-500" />
                  Pluie
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Contexte particulier ?</Label>
            <ToggleGroup type="multiple" value={context} onValueChange={setContext} className="justify-start gap-2 flex-wrap">
              <ToggleGroupItem value="holiday" aria-label="Toggle holiday" className="border border-input data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <CalendarDays className="mr-2 h-4 w-4" />
                Vacances / Férié
              </ToggleGroupItem>
              <ToggleGroupItem value="exams" aria-label="Toggle exams" className="border border-input data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <GraduationCap className="mr-2 h-4 w-4" />
                Examens
              </ToggleGroupItem>
              <ToggleGroupItem value="strike" aria-label="Toggle strike" className="border border-input data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Grèves / Transports
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleDismiss}>Ignorer</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enregistrer le bilan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
