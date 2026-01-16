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
        className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-glow hover:shadow-strong animate-pulse-glow"
        variant="accent"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 safe-area-pb">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 min-w-[64px]",
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
                      "p-2 rounded-xl transition-all duration-300",
                      isActive && "bg-gradient-to-br from-primary/20 to-violet-500/20 shadow-soft"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                  </div>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
