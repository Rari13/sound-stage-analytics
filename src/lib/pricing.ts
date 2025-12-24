export const PRICING_STRATEGY = {
  // Plan GRATUIT (Starter)
  // Frais fixes uniquement, paiement immédiat
  starter: {
    name: "Starter",
    monthlyPrice: 0,
    features: [
      "Billetterie illimitée",
      "Scanner d'entrée",
      "Paiement immédiat",
      "Tableau de bord standard"
    ],
    fees: {
      percent: 0,    // 0% de commission variable
      fixed: 1.50,   // 1.50€ fixe par billet
    },
    aiLimits: {
      flyers: 1,
      analysis: false
    }
  },

  // Plan PRO (Spark Pro)
  // Pour les organisateurs sérieux et réguliers
  pro: {
    name: "Spark Pro",
    monthlyPrice: 15000, // 150.00€ en centimes
    features: [
      "Commission fixe unique (0.99€)",
      "Paiements Instantanés",
      "Data Intelligence illimitée",
      "Studio Graphique IA illimité"
    ],
    fees: {
      percent: 0,    // 0% de commission variable
      fixed: 0.99,   // 0.99€ fixe par billet
    },
    aiLimits: {
      flyers: 9999,
      analysis: true
    }
  }
};

// Fonction utilitaire pour calculer le prix final d'un billet
export const calculateTicketPrice = (basePriceCents: number, plan: 'starter' | 'pro' = 'starter') => {
  const strategy = PRICING_STRATEGY[plan];
  
  // Frais Sound
  const applicationFee = Math.round(
    (basePriceCents * strategy.fees.percent) + (strategy.fees.fixed * 100)
  );

  // Prix total payé par le client
  const totalAmount = basePriceCents + applicationFee;

  return {
    basePrice: basePriceCents,
    applicationFee,
    totalAmount,
    currency: 'EUR'
  };
};

// Fonction pour afficher les frais de manière lisible
export const formatFees = (plan: 'starter' | 'pro' = 'starter') => {
  const strategy = PRICING_STRATEGY[plan];
  return `${strategy.fees.fixed.toFixed(2)}€ / billet`;
};
