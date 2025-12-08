import { Button } from "@/components/ui/button";
import { Ticket, ArrowRight, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">
            Spark Events
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Connexion</Link>
            </Button>
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/signup-client">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile-first with generous whitespace */}
      <section className="pt-32 pb-16 px-4 md:pt-40 md:pb-24">
        <div className="container mx-auto max-w-2xl text-center space-y-8">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Vos billets.
            <br />
            <span className="text-muted-foreground">Simplement.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Réservez vos places pour les meilleurs événements en quelques secondes.
          </p>

          <div className="flex flex-col gap-3 pt-4 max-w-xs mx-auto">
            <Button variant="accent" size="xl" asChild className="w-full">
              <Link to="/signup-client">
                Découvrir les événements
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full">
              <Link to="/signup-organizer">
                Je suis organisateur
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features - Minimal cards */}
      <section className="py-16 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-6 rounded-2xl bg-background">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Ticket className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Billets sécurisés</h3>
              <p className="text-sm text-muted-foreground">
                QR codes uniques et validation en temps réel
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-background">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Paiement instantané</h3>
              <p className="text-sm text-muted-foreground">
                Recevez vos billets par email immédiatement
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-background">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">100% fiable</h3>
              <p className="text-sm text-muted-foreground">
                Protection contre la fraude et les doublons
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-lg text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            Prêt à commencer ?
          </h2>
          <p className="text-muted-foreground">
            Créez votre compte gratuitement et accédez à tous les événements.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" asChild>
              <Link to="/signup-client">Créer un compte</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 Spark Events. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
