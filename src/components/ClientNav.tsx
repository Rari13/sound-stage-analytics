import { NavLink } from "react-router-dom";
import { Home, Flame, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/client/home", icon: Home, label: "Accueil" },
  { to: "/client/discover", icon: Flame, label: "Découvrir" },
  { to: "/client/tickets", icon: Ticket, label: "Billets" },
  { to: "/client/profile", icon: User, label: "Profil" },
];

export function ClientNav() {
  return (
    <>
      {/* Spacer for fixed nav */}
      <div className="h-20 pb-safe" />
      
      {/* Native-style bottom navigation */}
      <nav className="native-nav">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all duration-200 min-w-[72px] tap-effect",
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
                        "h-6 w-6 transition-transform duration-200", 
                        isActive && "scale-105"
                      )} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium transition-all",
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
