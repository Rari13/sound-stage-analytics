import { ReactNode } from "react";
import { ClientNav } from "@/components/ClientNav";
import { SafetyWidget } from "@/components/SafetyWidget";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      
      {/* Safe area for Dynamic Island / Notch */}
      <div className="safe-area-top" />
      
      {/* Main content with native scroll */}
      <main className="relative native-scroll scrollbar-hide animate-fade-in">
        {children}
      </main>

      <SafetyWidget />
      <ClientNav />
    </div>
  );
}
