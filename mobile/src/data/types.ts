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

export interface Exchange {
  id: string;
  who: string;
  role: string;
  give: string;
  want: string;
  tag: 'Soin contre soin' | 'Service contre soin' | 'Bénévolat' | 'Formation contre formation' | 'Soin contre don';
  avatar: readonly [string, string, ...string[]];
  message?: string;
  mode?: 'Visio' | 'Présentiel' | 'Peu importe';
  delay?: string;
  publishedAgo?: string;
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
