import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import OrganizerLayout from "@/layouts/OrganizerLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Percent, Euro, Calendar, Hash, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PromoCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  event_id: string | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
}

const OrganizerPromoCodes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    event_id: "all",
    usage_limit: "",
    expires_at: "",
  });

  // Fetch organizer
  const { data: organizer } = useQuery({
    queryKey: ["organizer", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizers")
        .select("id")
        .eq("owner_user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch promo codes
  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ["promo_codes", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoCode[];
    },
    enabled: !!organizer?.id,
  });

  // Fetch events for dropdown
  const { data: events } = useQuery({
    queryKey: ["organizer_events", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .eq("organizer_id", organizer!.id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!organizer?.id,
  });

  // Create promo code mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("promo_codes").insert({
        organizer_id: organizer!.id,
        code: formData.code.toUpperCase().trim(),
        discount_type: formData.discount_type,
        discount_value: parseInt(formData.discount_value),
        event_id: formData.event_id === "all" ? null : formData.event_id,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        expires_at: formData.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo_codes"] });
      toast({ title: "Code promo créé avec succès" });
      setIsDialogOpen(false);
      setFormData({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        event_id: "all",
        usage_limit: "",
        expires_at: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message.includes("duplicate")
          ? "Ce code existe déjà"
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("promo_codes")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo_codes"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo_codes"] });
      toast({ title: "Code promo supprimé" });
    },
  });

  const getEventTitle = (eventId: string | null) => {
    if (!eventId) return "Tous les événements";
    const event = events?.find((e) => e.id === eventId);
    return event?.title || "Événement inconnu";
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isLimitReached = (code: PromoCode) => {
    if (!code.usage_limit) return false;
    return code.usage_count >= code.usage_limit;
  };

  return (
    <OrganizerLayout>
      <div className="p-4 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Codes Promo</h1>
            <p className="text-sm text-muted-foreground">
              Créez des réductions pour vos clients
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Créer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nouveau code promo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    placeholder="SUMMER20"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    maxLength={20}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de réduction</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(v: "percentage" | "fixed") =>
                        setFormData({ ...formData, discount_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Valeur {formData.discount_type === "percentage" ? "(%)" : "(€)"}
                    </Label>
                    <Input
                      type="number"
                      placeholder={formData.discount_type === "percentage" ? "20" : "5"}
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_value: e.target.value })
                      }
                      min={1}
                      max={formData.discount_type === "percentage" ? 100 : undefined}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Appliquer à</Label>
                  <Select
                    value={formData.event_id}
                    onValueChange={(v) => setFormData({ ...formData, event_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un événement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous mes événements</SelectItem>
                      {events?.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Limite d'utilisation</Label>
                    <Input
                      type="number"
                      placeholder="Illimité"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData({ ...formData, usage_limit: e.target.value })
                      }
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expire le</Label>
                    <Input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) =>
                        setFormData({ ...formData, expires_at: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={
                    !formData.code || !formData.discount_value || createMutation.isPending
                  }
                >
                  {createMutation.isPending ? "Création..." : "Créer le code"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : promoCodes?.length === 0 ? (
          <Card className="p-8 text-center">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Aucun code promo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier code promo pour attirer plus de clients
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un code
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {promoCodes?.map((code) => (
              <Card key={code.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-lg font-mono font-bold text-primary">
                        {code.code}
                      </code>
                      {!code.is_active && (
                        <Badge variant="secondary">Désactivé</Badge>
                      )}
                      {isExpired(code.expires_at) && (
                        <Badge variant="destructive">Expiré</Badge>
                      )}
                      {isLimitReached(code) && (
                        <Badge variant="outline">Limite atteinte</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {code.discount_type === "percentage" ? (
                          <Percent className="h-3.5 w-3.5" />
                        ) : (
                          <Euro className="h-3.5 w-3.5" />
                        )}
                        -{code.discount_value}
                        {code.discount_type === "percentage" ? "%" : "€"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5" />
                        {code.usage_count}
                        {code.usage_limit ? `/${code.usage_limit}` : ""} utilisations
                      </span>
                      {code.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(code.expires_at), "dd MMM yyyy", {
                            locale: fr,
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {getEventTitle(code.event_id)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={code.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: code.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(code.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
};

export default OrganizerPromoCodes;