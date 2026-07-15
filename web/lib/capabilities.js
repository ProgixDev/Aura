// Mirrors server/src/auth/capabilities.ts exactly — same role ids, same
// capability ids, same per-role capability sets. Kept as a manually-synced
// duplicate because web/ and server/ are separate packages with no
// shared-types build step (the same pattern already used for every other
// server-side enum re-declared as a plain JS value on the web side). If the
// server's CAPABILITIES matrix ever changes, this file must change with it.
export const ROLE_ORDER = ['admin', 'moderateur', 'support', 'comptabilite'];

export const ROLE_LABELS = {
  admin: 'Administrateur',
  moderateur: 'Modérateur',
  support: 'Support',
  comptabilite: 'Comptabilité',
};

export const ROLE_DESCRIPTIONS = {
  admin: 'Accès complet à tous les modules et réglages.',
  moderateur: 'Modération des contenus, avis, signalements et messages.',
  support: 'Gestion des tickets et assistance utilisateur.',
  comptabilite: 'Paiements, remboursements, exports comptables.',
};

export const CAPABILITY_ORDER = [
  'dashboard',
  'praticiens_verification',
  'clients',
  'reservations',
  'avis_moderation',
  'signalements_litiges',
  'tickets_support',
  'paiements_remboursements',
  'abonnements_promos',
  'equipe_roles',
  'reglages_systeme',
];

export const CAPABILITY_LABELS = {
  dashboard: 'Tableau de bord',
  praticiens_verification: 'Praticiens & vérifications',
  clients: 'Clients',
  reservations: 'Réservations',
  avis_moderation: 'Avis & modération',
  signalements_litiges: 'Signalements & litiges',
  tickets_support: 'Tickets de support',
  paiements_remboursements: 'Paiements & remboursements',
  abonnements_promos: 'Abonnements & promos',
  equipe_roles: 'Équipe & rôles',
  reglages_systeme: 'Réglages système',
};

// role -> capability ids, transcribed from server/src/auth/capabilities.ts's
// CAPABILITIES matrix (itself transcribed from the original mock).
export const CAPABILITIES = {
  admin: [...CAPABILITY_ORDER],
  moderateur: ['dashboard', 'praticiens_verification', 'clients', 'avis_moderation', 'signalements_litiges'],
  support: ['dashboard', 'clients', 'reservations', 'tickets_support'],
  comptabilite: ['dashboard', 'paiements_remboursements', 'abonnements_promos'],
};
