import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Sparkles, Brain, CreditCard, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import sparkLogo from "@/assets/spark-logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={sparkLogo} alt="Spark Events" className="h-8 w-8" />
            <span className="text-xl font-bold text-primary">Spark Events</span>
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

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 md:pt-40 md:pb-24">
        <div className="container mx-auto max-w-2xl text-center space-y-8">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            L'événementiel
            <br />
            <span className="text-primary">réinventé.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Organisez ou découvrez les meilleurs événements en toute simplicité.
          </p>

          <div className="flex flex-col gap-3 pt-4 max-w-xs mx-auto">
            <Button size="xl" asChild className="w-full">
              <Link to="/signup-client">
                Je cherche un événement
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

      {/* Features for Clients */}
      <section className="py-16 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Pour les festivaliers</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2">Vivez l'expérience</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-6 rounded-2xl bg-background shadow-card">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Sécurité intégrée</h3>
              <p className="text-sm text-muted-foreground">
                Contact de confiance, géolocalisation et retour maison sécurisé
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-background shadow-card">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Paiement groupé</h3>
              <p className="text-sm text-muted-foreground">
                Partagez la note avec vos amis en quelques clics
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-background shadow-card">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Événements personnalisés</h3>
              <p className="text-sm text-muted-foreground">
                Découvrez des événements qui vous correspondent vraiment
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features for Organizers */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Pour les organisateurs</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2">Boostez vos événements</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-6 rounded-2xl bg-secondary/50 shadow-card">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">IA Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Comprenez votre audience et anticipez la demande avec l'IA
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-secondary/50 shadow-card">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Spark Studio</h3>
              <p className="text-sm text-muted-foreground">
                Créez des visuels professionnels en quelques secondes
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-secondary/50 shadow-card">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Revenus instantanés</h3>
              <p className="text-sm text-muted-foreground">
                Recevez vos paiements en temps réel sur votre compte
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-lg text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            Prêt à commencer ?
          </h2>
          <p className="text-primary-foreground/80">
            Créez votre compte gratuitement et accédez à tous les événements.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup-client">Créer un compte</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
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