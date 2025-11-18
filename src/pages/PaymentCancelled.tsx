import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

const PaymentCancelled = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Paiement annulé</h1>
        <p className="text-muted-foreground mb-6">
          Votre paiement a été annulé. Aucun montant n'a été débité.
        </p>
        
        <div className="space-y-3">
          <Button onClick={() => window.history.back()} className="w-full">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour à l'événement
          </Button>
          <Link to="/events/browse" className="block">
            <Button variant="outline" className="w-full">
              Découvrir d'autres événements
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default PaymentCancelled;
