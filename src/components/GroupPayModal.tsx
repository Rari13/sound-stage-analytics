import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, Share2, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface GroupPayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  priceTierId: string;
  pricePerTicket: number;
  totalTickets: number;
}

export function GroupPayModal({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  priceTierId,
  pricePerTicket,
  totalTickets,
}: GroupPayModalProps) {
  const { user } = useAuth();
  const [emails, setEmails] = useState<string[]>([user?.email || ""]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const addEmail = () => {
    if (newEmail && !emails.includes(newEmail.toLowerCase()) && emails.length < totalTickets) {
      setEmails([...emails, newEmail.toLowerCase().trim()]);
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    if (email !== user?.email) {
      setEmails(emails.filter(e => e !== email));
    }
  };

  const handleCreateGroup = async () => {
    if (emails.length !== totalTickets) {
      toast.error(`Ajoutez ${totalTickets} participants (actuellement ${emails.length})`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-group-order", {
        body: {
          eventId,
          priceTierId,
          totalTickets,
          participantEmails: emails,
        },
      });

      if (error) throw new Error(error.message);
      
      setShareUrl(data.shareUrl);
      toast.success("Groupe créé !", { description: "Partagez le lien avec vos amis" });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du groupe");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (shareUrl && navigator.share) {
      try {
        await navigator.share({
          title: `Group Pay - ${eventTitle}`,
          text: `Rejoins-moi pour ${eventTitle} ! Chacun paie sa part.`,
          url: shareUrl,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            Group Pay
          </DialogTitle>
          <DialogDescription>
            {shareUrl 
              ? "Partagez ce lien avec vos amis pour qu'ils paient leur part."
              : `Ajoutez les emails de ${totalTickets} participants`
            }
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-6 pt-4">
            {/* Price Summary */}
            <div className="p-4 bg-secondary rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Prix par personne</span>
                <span className="text-2xl font-bold">{(pricePerTicket / 100).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                <span className="text-muted-foreground">Total groupe</span>
                <span className="font-medium">{((pricePerTicket * totalTickets) / 100).toFixed(2)} €</span>
              </div>
            </div>

            {/* Participant Emails */}
            <div className="space-y-3">
              <Label className="flex justify-between">
                Participants
                <Badge variant="outline">{emails.length}/{totalTickets}</Badge>
              </Label>
              
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input 
                    value={email} 
                    disabled 
                    className="bg-secondary border-none"
                  />
                  {email !== user?.email && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeEmail(email)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {email === user?.email && (
                    <Badge variant="secondary" className="shrink-0">Vous</Badge>
                  )}
                </div>
              ))}

              {emails.length < totalTickets && (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@exemple.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEmail()}
                    className="border-dashed"
                  />
                  <Button size="icon" variant="outline" onClick={addEmail}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Create Button */}
            <Button 
              className="w-full h-12 rounded-xl font-bold"
              onClick={handleCreateGroup}
              disabled={loading || emails.length !== totalTickets}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Users className="h-5 w-5 mr-2" />
              )}
              Créer le groupe
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Success State */}
            <div className="text-center py-6">
              <div className="h-16 w-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-bold text-lg mb-2">Groupe créé !</h3>
              <p className="text-muted-foreground text-sm">
                Chaque participant recevra son billet après paiement
              </p>
            </div>

            {/* Share Link */}
            <div className="p-4 bg-secondary rounded-2xl">
              <p className="text-xs text-muted-foreground mb-2 uppercase font-medium">Lien de partage</p>
              <p className="text-sm font-mono break-all">{shareUrl}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-xl"
                onClick={copyLink}
              >
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl"
                onClick={shareLink}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>

            {/* Go to group page */}
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => window.location.href = shareUrl}
            >
              Voir la page du groupe
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
