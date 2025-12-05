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
      <div className="h-20" />
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-50 safe-bottom">
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
