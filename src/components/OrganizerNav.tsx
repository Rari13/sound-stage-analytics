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
      {/* Floating Action Button - positioned above nav with safe area */}
      <Button
        onClick={() => navigate("/orga/events/create")}
        className="fixed z-50 h-14 w-14 rounded-full shadow-glow tap-effect"
        style={{ 
          bottom: `calc(5rem + env(safe-area-inset-bottom, 0px))`,
          right: '1rem'
        }}
        variant="default"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Native-style bottom navigation */}
      <nav className="native-nav">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[64px] tap-effect",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "p-2 rounded-xl transition-all duration-200",
                      isActive && "bg-primary/15 shadow-sm"
                    )}
                  >
                    <item.icon 
                      className={cn(
                        "h-5 w-5 transition-transform duration-200", 
                        isActive && "scale-105"
                      )} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium transition-all",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
