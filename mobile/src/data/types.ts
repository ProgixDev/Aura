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
  dayMark?: string;
  proposal?: {
    when: string;
    durationMinutes: number;
    mode: 'présentiel' | 'visio';
    price: number;
  };
}

export interface Review {
  id: string;
  practitionerId: string;
  authorInitial: string;
  whenLabel: string;
  modeLabel: string;
  rating: number;
  text: string;
}

export interface BookingDraft {
  practitionerId: string;
  day?: { label: string; date: string };
  slot?: string;
  mode?: 'présentiel' | 'visio';
  total?: number;
}
