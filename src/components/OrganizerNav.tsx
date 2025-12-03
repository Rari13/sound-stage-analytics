import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, QrCode, Brain, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/orga/home", icon: Home, label: "Accueil" },
  { to: "/orga/events", icon: Calendar, label: "Événements" },
  { to: "/orga/scan", icon: QrCode, label: "Scanner" },
  { to: "/orga/analytics", icon: Brain, label: "Intelligence" },
];

export function OrganizerNav() {
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => navigate("/orga/events/create")}
        className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
        variant="accent"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-area-pb">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "p-1.5 rounded-lg transition-all duration-200",
                      isActive && "bg-primary/10"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
