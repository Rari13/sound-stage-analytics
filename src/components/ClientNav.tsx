import { Link, useLocation } from "react-router-dom";
import { Home, Flame, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClientNav() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: "Accueil", icon: Home, path: "/client/home" },
    { label: "Découvrir", icon: Flame, path: "/client/discover" },
    { label: "Billets", icon: Ticket, path: "/client/tickets" },
    { label: "Profil", icon: User, path: "/client/profile" },
  ];

  return (
    <>
      <div className="h-20 md:hidden" />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-50 safe-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-all duration-200",
                isActive(item.path) 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-6 w-6 transition-transform",
                isActive(item.path) && "scale-110"
              )} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
