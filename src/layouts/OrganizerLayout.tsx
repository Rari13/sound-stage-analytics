import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OrganizerNav } from "@/components/OrganizerNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface OrganizerLayoutProps {
  children: ReactNode;
}

export default function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrganizer = async () => {
      const { data } = await supabase
        .from("organizers")
        .select("name, avatar_url")
        .eq("owner_user_id", user.id)
        .single();

      setOrganizer(data);
      setLoading(false);
    };

    fetchOrganizer();
  }, [user]);

  const initials = organizer?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "OR";

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      
      {/* Native-style header with safe area for notch/Dynamic Island */}
      <header className="sticky top-0 z-30 glass border-b border-border/30 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          {loading ? (
            <>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar
                className="h-10 w-10 cursor-pointer ring-2 ring-primary/20 transition-all active:scale-95 active:ring-primary/40"
                onClick={() => navigate("/orga/profile")}
              >
                <AvatarImage src={organizer?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm leading-tight">{organizer?.name}</p>
                <p className="text-xs text-muted-foreground">Organisateur</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content with native scroll - extra padding for FAB */}
      <main className="relative px-4 py-4 max-w-lg mx-auto native-scroll scrollbar-hide" 
        style={{ 
          paddingBottom: `calc(8rem + env(safe-area-inset-bottom, 0px))` 
        }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <OrganizerNav />
    </div>
  );
}
