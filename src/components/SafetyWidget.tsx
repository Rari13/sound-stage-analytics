import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Shield, Phone, MessageCircle, MapPin, X } from "lucide-react";

export function SafetyWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const safetyActions = [
    {
      label: "Appeler les secours",
      icon: Phone,
      action: () => window.open("tel:112", "_self"),
      color: "bg-destructive text-destructive-foreground",
    },
    {
      label: "Prévenir un proche",
      icon: MessageCircle,
      action: () => {
        const message = encodeURIComponent("Je rentre de soirée, tout va bien !");
        window.open(`https://wa.me/?text=${message}`, "_blank");
      },
      color: "bg-success text-success-foreground",
    },
    {
      label: "Ma position",
      icon: MapPin,
      action: () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            window.open(`https://maps.google.com/?q=${latitude},${longitude}`, "_blank");
          });
        }
      },
      color: "bg-primary text-primary-foreground",
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-24 right-4 md:bottom-6 z-50 h-14 w-14 rounded-full bg-foreground text-background shadow-strong hover:bg-foreground/90 animate-press"
        >
          <Shield className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5" />
            Zone de sécurité
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-3 pb-6">
          {safetyActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className={`w-full h-14 justify-start gap-4 text-base font-medium rounded-2xl border-2 ${action.color}`}
              onClick={action.action}
            >
              <action.icon className="h-5 w-5" />
              {action.label}
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          En cas d'urgence, appelez le 112 (Europe) ou le 15 (SAMU)
        </p>
      </SheetContent>
    </Sheet>
  );
}
