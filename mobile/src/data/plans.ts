export interface PlanDef {
  id: 'essentiel' | 'pro' | 'premium';
  name: string;
  price: number;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

// Mirrors web/lib/data/content.js's `plans` array exactly — canonical 3-tier copy (P8-3).
// Kept as a hand-written mirror since this codebase has no shared package between web/ and
// mobile/.
export const PLANS: PlanDef[] = [
  {
    id: 'essentiel', name: 'Essentiel', price: 0, period: 'gratuit', tagline: 'Pour démarrer',
    features: ['Profil public vérifié', "Jusqu'à 5 séances / mois", 'Messagerie sécurisée', 'Paiement protégé'],
    cta: 'Commencer gratuitement', highlight: false,
  },
  {
    id: 'pro', name: 'Pro', price: 29, period: '/ mois', tagline: 'Le choix des praticiens établis',
    features: ['Tout Essentiel', 'Séances illimitées', 'Mise en avant dans la recherche', 'Statistiques détaillées', "Gestion d'événements", 'Troc de soins'],
    cta: 'Choisir Pro', highlight: true,
  },
  {
    id: 'premium', name: 'Premium', price: 59, period: '/ mois', tagline: 'Pour rayonner',
    features: ['Tout Pro', 'Badge « À la une »', 'Page praticien personnalisée', 'Support prioritaire', 'Accompagnement dédié', 'Outils retraites & cercles'],
    cta: 'Choisir Premium', highlight: false,
  },
];
