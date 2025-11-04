import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ticket, Calendar, Heart, User } from "lucide-react";
import { Link } from "react-router-dom";

const ClientHome = () => {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Mes événements</h1>
            <p className="text-muted-foreground">Bienvenue sur votre espace client</p>
          </div>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-2 hover:shadow-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Ticket className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mes billets</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-accent-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Événements à venir</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Heart className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organisateurs suivis</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="p-8 md:p-12">
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
                <Ticket className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">Aucun billet pour le moment</h2>
            <p className="text-lg text-muted-foreground">
              Découvrez des événements incroyables et réservez vos billets en quelques clics
            </p>
            <Button variant="hero" size="lg" className="mt-4">
              Découvrir les événements
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-xl font-bold">Événements recommandés</h3>
            <p className="text-muted-foreground">
              Complétez votre profil pour recevoir des recommandations personnalisées
            </p>
            <Button variant="accent">Compléter mon profil</Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-xl font-bold">Mes favoris</h3>
            <p className="text-muted-foreground">
              Suivez vos organisateurs préférés pour ne rien manquer
            </p>
            <Button variant="outline">Voir les organisateurs</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
