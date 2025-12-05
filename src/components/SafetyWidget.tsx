import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Shield, Phone, MessageCircle, MapPin, Home as HomeIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function SafetyWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
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

  const safetyActions = [
    {
      label: "Appeler les secours (112)",
      icon: Phone,
      action: () => window.open("tel:112", "_self"),
      color: "bg-red-500 hover:bg-red-600 text-white border-red-500",
    },
    {
      label: "Rentrer à la maison",
      icon: HomeIcon,
      action: handleGoHome,
      color: "bg-blue-500 hover:bg-blue-600 text-white border-blue-500",
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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-24 right-4 md:bottom-6 z-50 h-14 w-14 rounded-full bg-foreground text-background shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:bg-foreground/90 hover:scale-105 transition-all duration-300 animate-in fade-in zoom-in"
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
          Sound s'engage pour votre sécurité. En cas de danger immédiat, composez toujours le 112.
        </p>
      </SheetContent>
    </Sheet>
  );
}
