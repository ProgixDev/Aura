/**
 * Repository layer — every screen reads through these functions.
 * disciplineRepo, practitionerRepo, and eventRepo now call the real backend
 * via the api client; screens never need to change. exchangeRepo and
 * messageRepo still read from in-memory mocks (out of scope for this plan).
 */
import { exchangesMock } from '../mock/exchanges';
import { conversationsMock, sampleChat } from '../mock/messages';
import { disciplineImageSource } from '../images';
import { api } from '../api/client';
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  Conversation,
  ChatMessage,
  Review,
  Circle,
  Article,
} from '../types';

const delay = <T>(value: T, ms = 60): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

// ---------- Adapters: raw backend rows -> existing UI shapes ----------
// Real fields map directly; fields with no backend source (photo, rating,
// online status, per-item accent colour…) get an honest neutral default
// instead of invented data. See the plan's Architecture notes.
const DEFAULT_GRADIENT = ['#C4B0E8', '#A8C8E8'] as const;
const DEFAULT_TONE: Discipline['tone'] = 'violet';

export function mapPraticien(row: any): Practitioner {
  return {
    id: String(row.id),
    name: `${row.firstname} ${row.lastname}`.trim(),
    specialties: row.specialite ? [row.specialite] : [],
    city: row.ville,
    mode: row.mode,
    price: Number(row.tarif),
    rating: 0,
    reviews: 0,
    level: row.niveau,
    verified: row.statut_verification === 'valide',
    online: false,
    novice: false,
    bio: row.bio,
    gradient: DEFAULT_GRADIENT,
    // `sessions` has no backend source; the one consumer (praticien/[id].tsx)
    // already reads it as `p.experience?.sessions ?? 600`, so omitting it
    // here (rather than inventing a count) is safe.
    experience: { years: row.experience } as Practitioner['experience'],
    photo: undefined,
    hero: undefined,
    gallery: [],
  };
}

export function mapDiscipline(row: any): Discipline {
  return {
    slug: row.slug,
    name: row.nom,
    tone: DEFAULT_TONE,
    glyph: row.glyphe,
    count: 0,
    intro: row.accroche,
    pullQuote: undefined,
    heroImage: disciplineImageSource(row.slug),
  };
}

function formatEventDates(dates: string[]): string {
  if (!Array.isArray(dates) || dates.length === 0) return '';
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
  if (dates.length === 1) return fmt(dates[0]);
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

export function mapEvent(row: any): Event {
  const when = formatEventDates(row.dates);
  return {
    id: String(row.id),
    title: row.titre,
    kind: (row.type || '').toUpperCase(),
    when,
    where: row.lieu,
    price: `${Math.round(Number(row.prix))} €`,
    priceFrom: Number(row.prix),
    gradient: DEFAULT_GRADIENT,
    description: row.description,
    hosts: (row.animateurs ?? []).map((a: any) => ({
      name: `${a.firstname} ${a.lastname}`.trim(),
      spec: a.specialite ?? '',
      gradient: DEFAULT_GRADIENT,
    })),
    program: undefined,
    meta: { dates: when, place: row.lieu, seats: row.nombre_places },
  };
}

export function mapCircle(row: any): Circle {
  return {
    id: String(row.id),
    nom: row.nom,
    description: row.description,
    color: row.color,
    animateur: row.animateur,
  };
}

export function mapArticle(row: any): Article {
  return {
    id: String(row.id),
    slug: row.slug,
    titre: row.titre,
    categorie: row.categorie,
    tonalite: row.tonalite,
    extrait: row.extrait,
    corps: row.corps,
    status: row.status,
    auteur: row.auteur,
    temps_lecture: row.temps_lecture,
    image_couverture: row.image_couverture,
    meta_description: row.meta_description,
    mot_clef: row.mot_clef,
    date_publication: row.date_publication,
  };
}

// ---------- Practitioners ----------
export const practitionerRepo = {
  list: (): Promise<Practitioner[]> =>
    api.get<{ data: any[] }>('/praticiens').then((res) => res.data.map(mapPraticien)),
  byId: (id: string): Promise<Practitioner | undefined> =>
    api.get<{ data: any }>(`/praticiens/${id}`).then((res) => mapPraticien(res.data)).catch(() => undefined),
  byDiscipline: (disciplineName: string): Promise<Practitioner[]> =>
    practitionerRepo.list().then((list) => list.filter((p) => p.specialties.includes(disciplineName))),
  recommended: (): Promise<Practitioner[]> =>
    practitionerRepo.list().then((list) => list.slice(0, 4)),
  // No reviews backend yet — Plan 07 builds the `avis` module. Return an
  // honest empty list rather than calling an endpoint that doesn't exist.
  reviewsFor: (_practitionerId: string): Promise<Review[]> => Promise.resolve([]),
};

// ---------- Disciplines ----------
export const disciplineRepo = {
  list: (): Promise<Discipline[]> =>
    api.get<{ data: any[] }>('/disciplines').then((res) => res.data.map(mapDiscipline)),
  bySlug: (slug: string): Promise<Discipline | undefined> =>
    disciplineRepo.list().then((list) => list.find((d) => d.slug === slug)),
};

// ---------- Events ----------
export const eventRepo = {
  list: (): Promise<Event[]> =>
    api.get<{ data: any[] }>('/events?status=publié&per_page=50').then((res) => res.data.map(mapEvent)),
  byId: (id: string): Promise<Event | undefined> =>
    api.get<{ data: any }>(`/events/${id}`).then((res) => mapEvent(res.data)).catch(() => undefined),
  featured: (): Promise<Event[]> => eventRepo.list().then((list) => list.slice(0, 2)),
};

// ---------- Cercles ----------
export const cercleRepo = {
  list: (): Promise<Circle[]> =>
    api.get<{ data: any[] }>('/cercles?per_page=50').then((res) => res.data.map(mapCircle)),
  byId: (id: string): Promise<Circle | undefined> =>
    api.get<{ data: any }>(`/cercles/${id}`).then((res) => mapCircle(res.data)).catch(() => undefined),
};

// ---------- Articles ----------
export const articleRepo = {
  list: (): Promise<Article[]> =>
    api.get<{ data: any[] }>('/articles?status=publié&per_page=50').then((res) => res.data.map(mapArticle)),
  bySlug: (slug: string): Promise<Article | undefined> =>
    api
      .get<{ data: any[] }>(`/articles?slug=${encodeURIComponent(slug)}&per_page=1`)
      .then((res) => (res.data[0] ? mapArticle(res.data[0]) : undefined)),
};

// ---------- Exchanges ----------
export const exchangeRepo = {
  list: (): Promise<Exchange[]> => delay(exchangesMock),
  byId: (id: string): Promise<Exchange | undefined> =>
    delay(exchangesMock.find((x) => x.id === id)),
  create: (draft: Partial<Exchange>): Promise<Exchange> => {
    const created: Exchange = {
      id: `x${Date.now()}`,
      who: 'Vous',
      role: 'Annecy',
      give: draft.give ?? '',
      want: draft.want ?? '',
      tag: (draft.tag ?? 'Soin contre soin') as Exchange['tag'],
      avatar: ['#C4B0E8', '#A8C8E8'] as const,
      ...draft,
    };
    exchangesMock.unshift(created);
    return delay(created);
  },
};

// ---------- Messaging ----------
export const messageRepo = {
  conversations: (): Promise<Conversation[]> => delay(conversationsMock),
  conversation: (id: string): Promise<Conversation | undefined> =>
    delay(conversationsMock.find((c) => c.id === id)),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    delay(sampleChat(conversationId)),
};

// ---------- Bookings ----------
/**
 * Frontend stub: pretends to "hold" the funds and returns a fake reference.
 * Replace with a real call (e.g. /api/bookings/hold) when a backend exists.
 */
export const bookingRepo = {
  hold: async (params: {
    practitionerId: string;
    when: string;
    mode: 'présentiel' | 'visio';
    total: number;
  }) =>
    delay({
      id: `AURA-${Date.now()}-${params.practitionerId.toUpperCase()}`,
      status: 'held' as const,
      ...params,
    }),
  release: async (bookingId: string) =>
    delay({ bookingId, status: 'released' as const }),
  refund: async (bookingId: string) =>
    delay({ bookingId, status: 'refunded' as const }),
};
