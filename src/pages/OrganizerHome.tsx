import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, DollarSign, Users, TrendingUp, Plus, BarChart3 } from "lucide-react";

const OrganizerHome = () => {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tableau de bord</h1>
            <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
          </div>
          <Button variant="hero" size="lg">
            <Plus className="mr-2" />
            Nouvel événement
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 space-y-2 hover:shadow-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Événements</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-accent-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenus</p>
                <p className="text-2xl font-bold">0 €</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billets vendus</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-accent-glow transition-base">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Followers</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 space-y-6 hover:shadow-glow transition-base">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <Calendar className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Créer un événement</h3>
                <p className="text-muted-foreground">Configurez et publiez votre prochain événement</p>
              </div>
            </div>
            <Button variant="default" size="lg" className="w-full">
              Commencer
            </Button>
          </Card>

          <Card className="p-8 space-y-6 hover:shadow-accent-glow transition-base">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-accent flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Business Intelligence</h3>
                <p className="text-muted-foreground">Analysez vos performances et tendances</p>
              </div>
            </div>
            <Button variant="accent" size="lg" className="w-full">
              Voir les analyses
            </Button>
          </Card>
        </div>

        {/* Recent Events Section */}
        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Événements récents</h2>
              <Button variant="outline">Voir tous</Button>
            </div>
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xl font-semibold mb-2">Aucun événement</p>
              <p className="text-muted-foreground mb-6">
                Créez votre premier événement pour commencer
              </p>
              <Button variant="hero">
                <Plus className="mr-2" />
                Créer un événement
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4 hover:shadow-soft transition-base">
            <h3 className="text-lg font-bold">Mes événements</h3>
            <p className="text-sm text-muted-foreground">
              Gérez tous vos événements en un seul endroit
            </p>
            <Button variant="outline" className="w-full">Accéder</Button>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-soft transition-base">
            <h3 className="text-lg font-bold">Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Paramètres de paiement et informations légales
            </p>
            <Button variant="outline" className="w-full">Configurer</Button>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-soft transition-base">
            <h3 className="text-lg font-bold">Page publique</h3>
            <p className="text-sm text-muted-foreground">
              Personnalisez votre page organisateur
            </p>
            <Button variant="outline" className="w-full">Voir</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrganizerHome;
