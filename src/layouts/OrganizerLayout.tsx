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
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {loading ? (
              <>
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-lg" />
              </>
            ) : (
              <>
                <Avatar
                  className="h-10 w-10 cursor-pointer ring-2 ring-primary/20 transition-all hover:ring-primary/40 hover:shadow-glow"
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative px-4 py-6 pb-32 max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <OrganizerNav />
    </div>
  );
}
