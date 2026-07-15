// Fixed roles + capability matrix for the admin panel — mirrors the mock exactly
// (web/app/admin/roles/page.jsx's CAPABILITIES array + web/lib/data/admin.js's
// `roles` array). This is a hardcoded constant, not an editable/dynamic system —
// see Plan 08b's design note: a live permission-matrix editor is explicitly out
// of scope (docs/superpowers/specs/2026-07-15-aura-08-heavy-modules-design.md,
// decision P8-6).
export type Role = 'admin' | 'moderateur' | 'support' | 'comptabilite';

export const ROLES: Role[] = ['admin', 'moderateur', 'support', 'comptabilite'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  moderateur: 'Modérateur',
  support: 'Support',
  comptabilite: 'Comptabilité',
};

export type Capability =
  | 'dashboard'
  | 'praticiens_verification'
  | 'clients'
  | 'reservations'
  | 'avis_moderation'
  | 'signalements_litiges'
  | 'tickets_support'
  | 'paiements_remboursements'
  | 'abonnements_promos'
  | 'equipe_roles'
  | 'reglages_systeme';

// Order matches the mock's row order exactly (web/app/admin/roles/page.jsx).
export const CAPABILITY_ORDER: Capability[] = [
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

export const CAPABILITY_LABELS: Record<Capability, string> = {
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

// role -> capability set, transcribed exactly from the mock's per-capability
// `roles` arrays (web/app/admin/roles/page.jsx): admin has every
// capability checked; moderateur/support/comptabilite each have a subset.
export const CAPABILITIES: Record<Role, Set<Capability>> = {
  admin: new Set(CAPABILITY_ORDER),
  moderateur: new Set<Capability>([
    'dashboard', 'praticiens_verification', 'clients', 'avis_moderation', 'signalements_litiges',
  ]),
  support: new Set<Capability>(['dashboard', 'clients', 'reservations', 'tickets_support']),
  comptabilite: new Set<Capability>(['dashboard', 'paiements_remboursements', 'abonnements_promos']),
};

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}

// A null/undefined/unrecognized role defaults to full 'admin' access. This is
// what keeps the whole change non-breaking: every admin row that existed before
// this plan (or is ever created without an explicit role) behaves exactly as it
// did when AdminGuard's binary is_admin check was the only thing that mattered.
export function hasCapability(role: string | null | undefined, capability: Capability): boolean {
  const effective: Role = isRole(role) ? role : 'admin';
  return CAPABILITIES[effective].has(capability);
}
