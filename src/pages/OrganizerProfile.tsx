import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, LogOut, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OrganizerProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizer, setOrganizer] = useState<{
    id: string;
    name: string;
    bio: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchOrganizer = async () => {
      const { data } = await supabase
        .from("organizers")
        .select("id, name, bio, avatar_url, phone")
        .eq("owner_user_id", user.id)
        .single();

      setOrganizer(data);
      setLoading(false);
    };

    fetchOrganizer();
  }, [user]);

  const handleSave = async () => {
    if (!organizer) return;

    setSaving(true);
    const { error } = await supabase
      .from("organizers")
      .update({
        name: organizer.name,
        bio: organizer.bio,
        phone: organizer.phone,
      })
      .eq("id", organizer.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil mis à jour");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizer) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${organizer.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("event-banners")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur upload");
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("event-banners")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("organizers")
      .update({ avatar_url: publicUrl.publicUrl })
      .eq("id", organizer.id);

    if (!updateError) {
      setOrganizer({ ...organizer, avatar_url: publicUrl.publicUrl });
      toast.success("Photo mise à jour");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const initials = organizer?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "OR";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-center font-semibold">Mon Profil</h1>
          <Button variant="ghost" size="icon" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage src={organizer?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg">
              <Camera className="h-4 w-4 text-primary-foreground" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
          </div>
          <p className="text-muted-foreground text-sm">Cliquez pour changer la photo</p>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'organisation</Label>
              <Input
                id="name"
                value={organizer?.name || ""}
                onChange={(e) =>
                  setOrganizer(organizer ? { ...organizer, name: e.target.value } : null)
                }
                placeholder="Votre nom d'organisateur"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={organizer?.bio || ""}
                onChange={(e) =>
                  setOrganizer(organizer ? { ...organizer, bio: e.target.value } : null)
                }
                placeholder="Décrivez votre activité..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={organizer?.phone || ""}
                onChange={(e) =>
                  setOrganizer(organizer ? { ...organizer, phone: e.target.value } : null)
                }
                placeholder="+33 6 00 00 00 00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
