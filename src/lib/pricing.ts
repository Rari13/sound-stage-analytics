export const PRICING_STRATEGY = {
  // Plan GRATUIT (Starter)
  // Idéal pour les petits événements associatifs ou ponctuels
  starter: {
    name: "Starter",
    monthlyPrice: 0,
    features: [
      "Billetterie illimitée",
      "Scanner d'entrée",
      "Paiement à J+7",
      "Tableau de bord standard"
    ],
    fees: {
      percent: 0.05, // 5% de commission
      fixed: 0.99,   // + 0.99€ par billet
    },
    aiLimits: {
      flyers: 1,
      analysis: false
    }
  },

  // Plan PRO (Le modèle "Shotgun Killer")
  // Pour les organisateurs sérieux et réguliers
  pro: {
    name: "Sound Pro + IA",
    monthlyPrice: 15000, // 150.00€ en centimes
    features: [
      "Commission fixe unique (0.99€)",
      "Paiements Instantanés (Bridge)",
      "IA Gemini : Analyses Prédictives Illimitées",
      "IA Studio : Génération de Flyers Illimitée",
      "Support WhatsApp dédié 24/7"
    ],
    fees: {
      percent: 0,    // 0% de commission variable !
      fixed: 0.99,   // 0.99€ fixe par billet (Comme Shotgun)
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
  
  if (strategy.fees.percent === 0) {
    return `${strategy.fees.fixed.toFixed(2)}€ / billet`;
  }
  
  return `${(strategy.fees.percent * 100).toFixed(0)}% + ${strategy.fees.fixed.toFixed(2)}€ / billet`;
};
