import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Sparkles, Brain, CreditCard, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import sparkLogo from "@/assets/spark-logo.png";

const Landing = () => {
  const [activeTab, setActiveTab] = useState<"client" | "organizer">("client");

  const clientFeatures = [
    {
      icon: Shield,
      title: "Sécurité intégrée",
      description: "Contact de confiance, géolocalisation et retour maison sécurisé"
    },
    {
      icon: Users,
      title: "Paiement groupé",
      description: "Partagez la note avec vos amis en quelques clics"
    },
    {
      icon: Heart,
      title: "Événements personnalisés",
      description: "Découvrez des événements qui vous correspondent vraiment"
    }
  ];

  const organizerFeatures = [
    {
      icon: Brain,
      title: "IA Analytics",
      description: "Une IA entraînée sur les données de centaines d'organisateurs afin d'avoir une parfaite compréhension des tendances du marché et d'avoir une prédiction d'affluence"
    },
    {
      icon: Sparkles,
      title: "Spark Studio",
      description: "Avec Spark Studio créez des visuels professionnels en quelques secondes avec votre agent IA designer, ou importez votre propre visuel !"
    },
    {
      icon: CreditCard,
      title: "Revenus instantanés",
      description: "Recevez vos paiements en instantané sur votre compte bancaire, Spark est la solution unique pour fluidifier votre trésorerie et payer vos prestataires"
    }
  ];

  const features = activeTab === "client" ? clientFeatures : organizerFeatures;

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

      {/* Features Section with Toggle */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          {/* Toggle Buttons */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-background rounded-full p-1.5 shadow-card border border-border">
              <button
                onClick={() => setActiveTab("client")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === "client"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pour les clients
              </button>
              <button
                onClick={() => setActiveTab("organizer")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === "organizer"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pour les organisateurs
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">
              {activeTab === "client" ? "Vivez l'expérience" : "Boostez vos événements"}
            </h2>
          </div>
          
          {/* Features Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="p-6 rounded-2xl bg-background shadow-card border border-border/50 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${
                  activeTab === "client" 
                    ? "bg-primary/10" 
                    : "bg-primary"
                }`}>
                  <feature.icon className={`h-6 w-6 ${
                    activeTab === "client" 
                      ? "text-primary" 
                      : "text-primary-foreground"
                  }`} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA for each mode */}
          <div className="text-center mt-10">
            <Button size="lg" asChild>
              <Link to={activeTab === "client" ? "/signup-client" : "/signup-organizer"}>
                {activeTab === "client" ? "Découvrir les événements" : "Créer mon événement"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
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