/** Domain types shared by mocks and (later) Supabase repositories. */

export type Mode = 'présentiel' | 'visio' | 'présentiel & visio' | 'visio uniquement';
export type Level = 'Novice' | 'Praticien confirmé' | 'Expert';

export interface Practitioner {
  id: string;
  name: string;
  specialties: string[];
  city: string;
  mode: Mode;
  price: number;
  rating: number;
  reviews: number;
  level: Level;
  verified: boolean;
  online?: boolean;
  novice?: boolean;
  bio: string;
  gradient: readonly [string, string, ...string[]];
  experience?: { years: number; sessions: number };
  /** Resolved at the repo layer from the image registry (require()'d assets). */
  photo?: import('react-native').ImageSourcePropType;
  hero?: import('react-native').ImageSourcePropType;
  gallery?: import('react-native').ImageSourcePropType[];
}

export interface Discipline {
  slug: string;
  name: string;
  tone: 'sky' | 'violet' | 'sage' | 'gold';
  glyph: string;
  count: number;
  intro?: string;
  pullQuote?: string;
  /** Remote hero image (Pexels), resolved at the repo layer. */
  heroImage?: import('react-native').ImageSourcePropType;
}

export interface Circle {
  id: string;
  nom: string;
  description: string | null;
  color: string | null;
  animateur: string | null;
  image: string | null;
}

export interface Article {
  id: string;
  slug: string;
  titre: string;
  categorie: string;
  tonalite: string;
  extrait: string;
  corps: string;
  status: string;
  auteur: string;
  temps_lecture: number;
  image_couverture: string | null;
  meta_description: string | null;
  mot_clef: string | null;
  date_publication: string | null;
}

export interface Event {
  id: string;
  title: string;
  kind: string;
  when: string;
  where: string;
  price: string;
  priceFrom: number;
  gradient: readonly [string, string, ...string[]];
  image?: string;
  description?: string;
  hosts?: Array<{ name: string; spec: string; gradient: readonly [string, string, ...string[]] }>;
  program?: Array<{ time: string; title: string; detail?: string }>;
  meta?: { dates: string; place: string; seats: number };
}

export interface PieceJointe {
  nom: string;
  chemin: string;
  taille: number;
  type: string;
}

export interface Exchange {
  id: number;
  client_id: number;
  sujet: string;
  type: 'proposition' | 'demande' | 'information' | 'autre';
  statut: string;
  priorite: string;
  message: string;
  format: string | null;
  ce_que_je_propose: string | null;
  ce_que_je_recherche: string | null;
  delai_souhaite: string | null;
  pieces_jointes: PieceJointe[] | null;
  created_at: string;
  updated_at: string;
}

/** Body shape for exchangeRepo.create/update — matches CreateEchangeDto/UpdateEchangeDto. */
export interface EchangeInput {
  sujet: string;
  type: 'proposition' | 'demande' | 'information' | 'autre';
  message: string;
  ce_que_je_propose?: string;
  ce_que_je_recherche?: string;
  format?: string;
  delai_souhaite?: string;
}

export interface PaymentRecord {
  id: number;
  reference: string;
  client_id: number;
  praticien_id: number | null;
  montant_brut: number;
  commission: number;
  montant_net_praticien: number;
  moyen_paiement: string;
  statut: string | null;
  date_paiement: string | null;
  created_at: string;
  praticien: { id: number; firstname: string; lastname: string } | null;
}

export interface Remboursement {
  id: number;
  reference: string;
  client_id: number;
  paiement_id: number;
  praticien_id: number | null;
  montant: number;
  motif: string;
  description: string | null;
  statut: string;
  commentaire_admin: string | null;
  date_traitement: string | null;
  date_remboursement: string | null;
  documents: unknown[] | null;
  created_at: string;
  paiement?: { id: number; reference: string } | null;
  praticien?: { id: number; firstname: string; lastname: string } | null;
}

export interface Conversation {
  id: string;
  name: string;
  avatar: readonly [string, string, ...string[]];
  photo?: import('react-native').ImageSourcePropType;
  preview: string;
  when: string;
  unread: boolean;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
  /** Real timestamp (ISO string) — `time` alone has no date, only "HH:MM". */
  createdAtIso: string;
  dayMark?: string;
}

/** Real `avis` row (server/src/database/entities/avis.entity.ts) — field names verbatim, no camelCase mapping layer. */
export interface Avis {
  id: number;
  full_name_author: string;
  praticien_id: number;
  note: number;
  avis: string;
  date_ajout: string;
  statut: string;
  created_at?: string;
  updated_at?: string;
}

/** Real `signalements` row (server/src/database/entities/signalement.entity.ts). */
export interface Signalement {
  id: number;
  date_signalement: string;
  type: string;
  sujet: string;
  motif: string;
  signale_par_id: number;
  praticien_id: number;
  priorite: string;
  statut: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationPreferences {
  rappels_seance: boolean;
  nouveaux_messages: boolean;
  reponses_avis: boolean;
  newsletter: boolean;
}

/** One row of `GET /api/client/favorites` — the favorite pivot joined with the full praticien row. */
export interface FavoritePraticien {
  id: number;
  client_id: number;
  praticien_id: number;
  created_at: string;
  praticien: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    telephone: string;
    ville: string;
    niveau: string;
    specialite: string;
    mode: string;
    status: string;
    tarif: number;
    experience: number;
    bio: string;
    statut_verification: string;
  };
}

export interface BookingDraft {
  practitionerId: string;
  day?: { label: string; date: string };
  slot?: string;
  mode?: 'présentiel' | 'visio';
  total?: number;
}

// Built up across onboarding/auth.tsx -> onboarding/praticien-profil.tsx ->
// onboarding/praticien-documents.tsx, then submitted as one multipart
// POST /praticien/register — the backend validates all fields + all 5
// documents in a single request, there is no partial/staged registration.
export interface PraticienRegistrationDraft {
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  telephone?: string;
  ville?: string;
  niveau?: string;
  specialite?: string;
  mode?: string;
  tarif?: number;
  experience?: number;
  bio?: string;
  documents?: Partial<Record<'piece_identite' | 'certification' | 'assurance' | 'domicile' | 'charte', { uri: string; name: string; mimeType: string }>>;
}

export interface RendezVousPraticien {
  id: number;
  firstname: string;
  lastname: string;
  ville: string;
  specialite: string;
  tarif: number;
}

export interface RendezVous {
  id: number;
  client_id: number;
  praticien_id: number;
  date_heure: string;
  duree_minutes: number;
  mode: 'présentiel' | 'visio';
  statut: 'en_attente' | 'confirme' | 'annule' | 'termine';
  tarif: number;
  promotion_id: number | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  praticien?: RendezVousPraticien;
}

export type SubscriptionPlan = 'essentiel' | 'pro' | 'premium';
export type SubscriptionStatut = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Subscription {
  id: number;
  praticien_id: number;
  plan: SubscriptionPlan;
  statut: SubscriptionStatut;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface StripeConnectStatus {
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean;
}
