import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Shield, Phone, MessageCircle, MapPin, Home as HomeIcon, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SafetyWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [emergencyContact, setEmergencyContact] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isOpen) {
      supabase
        .from('client_profiles')
        .select('address, city')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const profileData = data as any;
            setHomeAddress(profileData.address || profileData.city || null);
          }
        });
      
      // Load emergency contact from localStorage
      const savedContact = localStorage.getItem(`emergency_contact_${user.id}`);
      if (savedContact) {
        const contact = JSON.parse(savedContact);
        setEmergencyContact(contact.phone);
        setNewContactName(contact.name || "");
        setNewContactPhone(contact.phone || "");
      }
    }
  }, [user, isOpen]);

  const handleGoHome = () => {
    if (!homeAddress) {
      toast({
        title: "Adresse manquante",
        description: "Configurez votre adresse dans votre profil.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { 
              setIsOpen(false); 
              navigate('/client/profile'); 
            }}
          >
            Configurer
          </Button>
        )
      });
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(homeAddress)}`, "_blank");
  };

  const handleCallContact = () => {
    if (!emergencyContact) {
      setShowContactDialog(true);
      return;
    }
    window.open(`tel:${emergencyContact}`, "_self");
  };

  const handleSaveContact = () => {
    if (!user || !newContactPhone) return;
    
    const contact = { name: newContactName, phone: newContactPhone };
    localStorage.setItem(`emergency_contact_${user.id}`, JSON.stringify(contact));
    setEmergencyContact(newContactPhone);
    setShowContactDialog(false);
    
    toast({
      title: "Contact enregistré",
      description: `${newContactName || "Contact"} a été ajouté comme personne de confiance.`
    });
  };

  const safetyActions = [
    {
      label: emergencyContact ? "Appeler mon contact" : "Ajouter un contact de confiance",
      icon: emergencyContact ? Phone : UserPlus,
      action: handleCallContact,
      color: "bg-primary hover:bg-primary-hover text-primary-foreground border-primary",
    },
    {
      label: "Rentrer à la maison",
      icon: HomeIcon,
      action: handleGoHome,
      color: "bg-primary hover:bg-primary-hover text-primary-foreground border-primary",
    },
    {
      label: "Prévenir un proche",
      icon: MessageCircle,
      action: () => {
        const message = encodeURIComponent("Je rentre, tout va bien ! Suis mon trajet.");
        window.open(`https://wa.me/?text=${message}`, "_blank");
      },
      color: "bg-green-500 hover:bg-green-600 text-white border-green-500",
    },
    {
      label: "Ma position exacte",
      icon: MapPin,
      action: () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            window.open(`https://maps.google.com/?q=${latitude},${longitude}`, "_blank");
          });
        }
      },
      color: "bg-secondary text-foreground border-border",
    },
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-24 right-4 md:bottom-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_hsl(217_91%_60%/0.4)] hover:bg-primary-hover hover:scale-105 transition-all duration-300 animate-in fade-in zoom-in"
          >
            <Shield className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[2rem] pb-safe border-t-0 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-6" />
          <SheetHeader className="pb-6">
            <SheetTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
              <Shield className="h-6 w-6 text-primary" />
              Safety Zone
            </SheetTitle>
          </SheetHeader>
          
          <div className="grid gap-3 pb-4">
            {safetyActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                className={`w-full h-16 justify-start gap-4 text-lg font-semibold rounded-2xl border transition-transform active:scale-[0.98] shadow-sm ${action.color}`}
                onClick={action.action}
              >
                <div className="p-2 bg-white/20 rounded-full">
                  <action.icon className="h-5 w-5" />
                </div>
                {action.label}
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Spark Events s'engage pour votre sécurité. En cas de danger immédiat, composez le 112.
          </p>
        </SheetContent>
      </Sheet>

      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un contact de confiance</DialogTitle>
            <DialogDescription>
              Cette personne pourra être appelée rapidement en cas de besoin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nom</Label>
              <Input
                id="contact-name"
                placeholder="Ex: Maman, Paul..."
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Numéro de téléphone</Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowContactDialog(false)}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleSaveContact} disabled={!newContactPhone}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}