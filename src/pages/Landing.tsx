import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Sparkles, Brain, CreditCard, Heart, Star, Zap, CheckCircle, TrendingUp, BarChart3, Target, Calculator } from "lucide-react";
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

  const stats = [
    { value: "500+", label: "Événements" },
    { value: "50K+", label: "Utilisateurs" },
    { value: "98%", label: "Satisfaction" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Grid Background Pattern */}
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={sparkLogo} alt="Spark Events" className="h-8 w-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
              Spark Events
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="rounded-full">
              <Link to="/login">Connexion</Link>
            </Button>
            <Button size="sm" asChild className="rounded-full hidden sm:inline-flex">
              <Link to="/signup-client">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:pt-44 md:pb-32">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 animate-float opacity-60">
          <Star className="h-6 w-6 text-primary fill-primary" />
        </div>
        <div className="absolute top-40 right-10 animate-float opacity-60" style={{ animationDelay: '1s' }}>
          <Zap className="h-8 w-8 text-violet-500" />
        </div>
        <div className="absolute bottom-20 left-20 animate-float opacity-40" style={{ animationDelay: '2s' }}>
          <Star className="h-4 w-4 text-primary fill-primary" />
        </div>

        <div className="container mx-auto max-w-3xl text-center space-y-8 relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border shadow-soft animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-accent-foreground">Nouveau : Yield Management IA</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            L'événementiel
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-violet-600 bg-clip-text text-transparent">
              réinventé.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Organisez ou découvrez les meilleurs événements avec une plateforme simple, intelligente et sécurisée.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button size="xl" asChild className="rounded-full shadow-glow hover:shadow-strong transition-all duration-300">
              <Link to="/signup-client">
                Je cherche un événement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="rounded-full">
              <Link to="/signup-organizer">
                Je suis organisateur
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curved Divider */}
      <div className="relative h-24">
        <svg viewBox="0 0 1440 100" className="absolute bottom-0 w-full h-full" preserveAspectRatio="none">
          <path 
            d="M0,0 C480,100 960,100 1440,0 L1440,100 L0,100 Z" 
            className="fill-primary"
          />
        </svg>
      </div>

      {/* Features Section */}
      <section className="relative py-20 px-4 bg-primary">
        <div className="container mx-auto max-w-5xl">
          {/* Toggle Buttons */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-background/10 backdrop-blur-sm rounded-full p-1.5 border border-white/10">
              <button
                onClick={() => setActiveTab("client")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === "client"
                    ? "bg-background text-foreground shadow-lg"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Pour les clients
              </button>
              <button
                onClick={() => setActiveTab("organizer")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === "organizer"
                    ? "bg-background text-foreground shadow-lg"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Pour les organisateurs
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {activeTab === "client" ? "Vivez l'expérience" : "Boostez vos événements"}
            </h2>
            <p className="text-white/70 mt-4 max-w-lg mx-auto">
              {activeTab === "client" 
                ? "Des outils pensés pour vous offrir la meilleure expérience" 
                : "Des outils puissants pour maximiser votre succès"}
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="p-8 rounded-3xl bg-background shadow-strong hover-lift animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mb-6 shadow-glow">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA for each mode */}
          <div className="text-center mt-12">
            <Button size="lg" variant="secondary" asChild className="rounded-full shadow-lg">
              <Link to={activeTab === "client" ? "/signup-client" : "/signup-organizer"}>
                {activeTab === "client" ? "Découvrir les événements" : "Créer mon événement"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Curved Divider Bottom */}
      <div className="relative h-24 bg-primary">
        <svg viewBox="0 0 1440 100" className="absolute bottom-0 w-full h-full" preserveAspectRatio="none">
          <path 
            d="M0,100 C480,0 960,0 1440,100 L1440,100 L0,100 Z" 
            className="fill-background"
          />
        </svg>
      </div>

      {/* AI & Data Science Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
              <Brain className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-500">Powered by Data & IA</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Une intelligence <span className="bg-gradient-to-r from-violet-500 to-primary bg-clip-text text-transparent">qui vous comprend</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              92% de précision sur le choix de l'événement qui correspond à la base client de votre club.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Bass Diffusion Model */}
            <div className="group p-6 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all hover-lift">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-5 group-hover:shadow-glow transition-all">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Prédiction des ventes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Anticipez la courbe de ventes de vos billets grâce à l'analyse des comportements d'achat et tendances du marché.
              </p>
            </div>

            {/* IPC Score */}
            <div className="group p-6 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all hover-lift">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-5 group-hover:shadow-glow transition-all">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Matching artiste-public</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Identifiez les artistes qui correspondent parfaitement à votre audience grâce à notre score de compatibilité.
              </p>
            </div>

            {/* Yield Management */}
            <div className="group p-6 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all hover-lift">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-5 group-hover:shadow-glow transition-all">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Prix dynamique</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Optimisez vos revenus automatiquement en ajustant vos prix selon la demande en temps réel.
              </p>
            </div>

            {/* Probabilité Sell-out */}
            <div className="group p-6 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all hover-lift">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-5 group-hover:shadow-glow transition-all">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Proba de sold-out</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Évaluez instantanément vos chances d'afficher complet et ajustez votre stratégie en conséquence.
              </p>
            </div>
          </div>

          {/* Bottom highlight */}
          <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-violet-500/10 via-primary/10 to-violet-500/10 border border-primary/20 text-center">
            <p className="text-lg font-medium mb-2">
              Des décisions data-driven pour maximiser votre succès
            </p>
            <p className="text-sm text-muted-foreground">
              Notre IA analyse des milliers d'événements pour vous offrir les meilleures recommandations.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-12">
            La confiance des organisateurs
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: CheckCircle, text: "Paiements sécurisés" },
              { icon: Zap, text: "Virements instantanés" },
              { icon: Shield, text: "Données protégées" },
            ].map((item, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-accent/50 border border-border"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="font-semibold">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-2xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-primary">Essai gratuit</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">
            Prêt à commencer ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Créez votre compte gratuitement et accédez à tous les événements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="xl" asChild className="rounded-full shadow-glow">
              <Link to="/signup-client">
                Créer un compte
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="rounded-full">
              <Link to="/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-secondary/30">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={sparkLogo} alt="Spark Events" className="h-6 w-6" />
            <span className="font-bold text-lg">Spark Events</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Spark Events. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
