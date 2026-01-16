import { ReactNode } from "react";
import { ClientNav } from "@/components/ClientNav";
import { SafetyWidget } from "@/components/SafetyWidget";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground pb-safe">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      
      <main className="relative animate-fade-in">
        {children}
      </main>

      <SafetyWidget />
      <ClientNav />
    </div>
  );
}
