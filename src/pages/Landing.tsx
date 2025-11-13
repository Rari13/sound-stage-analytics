import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Users, Ticket, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 px-4 md:py-32">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Sound
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto px-4">
              La plateforme de billetterie nouvelle génération pour les événements musicaux
            </p>
            <div className="flex flex-col gap-3 justify-center items-center mt-8 px-4">
                <Button asChild variant="hero" size="lg" className="w-full sm:w-auto" aria-label="Inscription client">
                  <Link to="/signup-client">
                    <Users className="mr-2" />
                    Je suis client
                  </Link>
                </Button>
              <Button asChild variant="accent" size="lg" className="w-full sm:w-auto" aria-label="Inscription organisateur">
                <Link to="/signup-organizer">
                  <Music className="mr-2" />
                  Je suis organisateur
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 md:py-20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-16">
            Une expérience <span className="text-primary">unique</span>
          </h2>
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            <Card className="p-6 md:p-8 space-y-4 hover:shadow-glow transition-base border-2">
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <Ticket className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold">Billets intelligents</h3>
              <p className="text-muted-foreground">
                Système de billetterie avec QR codes sécurisés et validation en temps réel
              </p>
            </Card>

            <Card className="p-8 space-y-4 hover:shadow-accent-glow transition-base border-2">
              <div className="h-14 w-14 rounded-2xl bg-gradient-accent flex items-center justify-center">
                <Zap className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold">Instantané</h3>
              <p className="text-muted-foreground">
                Paiements rapides, émission instantanée et notifications en temps réel
              </p>
            </Card>

            <Card className="p-8 space-y-4 hover:shadow-glow transition-base border-2">
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <Users className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold">Pour tous</h3>
              <p className="text-muted-foreground">
                Interface intuitive pour les clients et outils puissants pour les organisateurs
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 md:py-20">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-6 md:p-12 text-center space-y-6 bg-gradient-to-br from-card to-secondary border-2">
            <h2 className="text-2xl md:text-4xl font-bold">
              Prêt à révolutionner vos événements ?
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              Rejoignez Sound aujourd'hui et découvrez une nouvelle façon de gérer vos billets
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" variant="default" className="w-full sm:w-auto" aria-label="Créer un compte">
                <Link to="/signup-client">Créer un compte</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto" aria-label="Se connecter">
                <Link to="/login">Se connecter</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Sound. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
