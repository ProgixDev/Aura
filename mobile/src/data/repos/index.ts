/**
 * Repository layer — every screen reads through these functions.
 * disciplineRepo, practitionerRepo, eventRepo, cercleRepo, articleRepo,
 * exchangeRepo, paiementRepo, remboursementRepo, rendezVousRepo, avisRepo,
 * signalementRepo, favoriteRepo, and notificationPreferencesRepo all call the
 * real NestJS backend — the auth token is already attached globally by
 * `src/store/session.ts`'s `setAuthenticated`. messageRepo (client) and
 * praticienMessageRepo (praticien) also call the real backend now.
 */
import { disciplineImageSource } from '../images';
import { api } from '../api/client';
import { dateFr } from '../../utils/format';
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  EchangeInput,
  PaymentRecord,
  Remboursement,
  Conversation,
  ChatMessage,
  Circle,
  Article,
  RendezVous,
  Avis,
  Signalement,
  NotificationPreferences,
  FavoritePraticien,
  Subscription,
  StripeConnectStatus,
  PraticienRegistrationDraft,
} from '../types';

// ---------- Adapters: raw backend rows -> existing UI shapes ----------
// Real fields map directly; rating/reviews come from the praticiens
// endpoints' attached rating + reviews_count (avg/count of published avis —
// see PraticiensService.attachRatings server-side). Fields with no backend
// source (online status, per-item accent colour…) get an honest neutral
// default instead of invented data. photo/hero/gallery come from the
// praticiens.photo/hero/gallery columns (Supabase Storage URLs), wrapped as
// {uri} for ImageSourcePropType.
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
    rating: row.rating ?? 0,
    reviews: row.reviews_count ?? 0,
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
    photo: row.photo ? { uri: row.photo } : undefined,
    hero: row.hero ? { uri: row.hero } : undefined,
    gallery: Array.isArray(row.gallery) ? row.gallery.map((uri: string) => ({ uri })) : [],
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
    image: row.image ?? undefined,
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
    image: row.image ?? null,
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
    api.get<{ data: any[] }>('/praticiens?per_page=50').then((res) => res.data.map(mapPraticien)),
  byId: (id: string): Promise<Practitioner | undefined> =>
    api.get<{ data: any }>(`/praticiens/${id}`).then((res) => mapPraticien(res.data)).catch(() => undefined),
  byDiscipline: (disciplineName: string): Promise<Practitioner[]> =>
    practitionerRepo.list().then((list) => list.filter((p) => p.specialties.includes(disciplineName))),
  recommended: (): Promise<Practitioner[]> =>
    practitionerRepo.list().then((list) => list.slice(0, 4)),
  // Real reviews now — delegates to avisRepo (defined below) rather than
  // duplicating the fetch here.
  reviewsFor: (practitionerId: string): Promise<Avis[]> => avisRepo.forPraticien(practitionerId),
  // Real 14-day rolling availability grid (excludes Sundays, blocks slots
  // already held by an en_attente/confirme rendez-vous) — mirrors what
  // web/app/(site)/reserver/[id]/BookingFlow.jsx already calls.
  availability: (id: string): Promise<Array<{ date: string; slots: Array<{ time: string; available: boolean }> }>> =>
    api.get<{ data: Array<{ date: string; slots: Array<{ time: string; available: boolean }> }> }>(`/praticiens/${id}/availability`)
      .then((res) => res.data),
};

// ---------- Avis (reviews) ----------
export const avisRepo = {
  forPraticien: (praticienId: string): Promise<Avis[]> =>
    api.get<{ data: Avis[] }>(`/avis?praticien_id=${praticienId}`).then((res) => res.data),
  create: (dto: { praticien_id: number; note: number; avis: string }): Promise<Avis> =>
    api.post<{ data: Avis }>('/client/avis', dto).then((res) => res.data),
};

// ---------- Signalements (reports) ----------
// Target is polymorphic — pass exactly one of praticien_id/client_id, never both.
export const signalementRepo = {
  create: (dto: {
    praticien_id?: number; client_id?: number; type: string; sujet: string; motif: string; priorite?: string;
  }): Promise<Signalement> =>
    api.post<{ data: Signalement }>('/signalements', dto).then((res) => res.data),
};

// ---------- Favorites ----------
export const favoriteRepo = {
  // Maps through the same mapPraticien used by practitionerRepo, so a
  // favorited praticien renders with <PractitionerCard> exactly like any
  // other praticien list — no separate card design needed.
  list: (): Promise<Practitioner[]> =>
    api.get<{ data: FavoritePraticien[] }>('/client/favorites')
      .then((res) => res.data.map((f) => mapPraticien(f.praticien))),
  add: (praticienId: string): Promise<void> =>
    api.post('/client/favorites', { praticien_id: Number(praticienId) }).then(() => undefined),
  remove: (praticienId: string): Promise<void> =>
    api.del(`/client/favorites/${praticienId}`).then(() => undefined),
};

// ---------- Notification preferences ----------
export const notificationPreferencesRepo = {
  get: (): Promise<NotificationPreferences> =>
    api.get<{ data: NotificationPreferences }>('/client/notification-preferences').then((res) => res.data),
  update: (patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> =>
    api.put<{ data: NotificationPreferences }>('/client/notification-preferences', patch).then((res) => res.data),
};

// ---------- Disciplines ----------
export const disciplineRepo = {
  list: (): Promise<Discipline[]> =>
    api.get<{ data: any[] }>('/disciplines').then((res) => res.data.map(mapDiscipline)),
  bySlug: (slug: string): Promise<Discipline | undefined> =>
    disciplineRepo.list().then((list) => list.find((d) => d.slug === slug)),
};

// ---------- Events ----------
export interface EventInscription {
  id: number;
  event_id: number;
  client_id: number;
  nombre_places: number;
  statut: string;
}

export const eventRepo = {
  list: (): Promise<Event[]> =>
    api.get<{ data: any[] }>('/events?status=publié&per_page=50').then((res) => res.data.map(mapEvent)),
  byId: (id: string): Promise<Event | undefined> =>
    api.get<{ data: any }>(`/events/${id}`).then((res) => mapEvent(res.data)).catch(() => undefined),
  featured: (): Promise<Event[]> => eventRepo.list().then((list) => list.slice(0, 2)),
  // Real, authenticated pre-registration — persists an event_inscriptions row.
  register: (eventId: string, nombrePlaces = 1): Promise<EventInscription> =>
    api.post<{ data: EventInscription }>(`/events/${eventId}/inscription`, { nombre_places: nombrePlaces })
      .then((res) => res.data),
  // The current client's registration for this event, or null if not registered.
  myInscription: (eventId: string): Promise<EventInscription | null> =>
    api.get<{ data: EventInscription | null }>(`/events/${eventId}/inscription/me`).then((res) => res.data),
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

// ---------- Exchanges (échanges) — real backend ----------
// Client's own échanges — used by the client-side "mine" bits (e.g. profil.tsx's active count).
export const exchangeRepo = {
  list: (): Promise<Exchange[]> =>
    api.get<{ data: Exchange[] }>('/echanges/client/echanges?per_page=50').then((r) => r.data),
  byId: (id: number): Promise<Exchange> =>
    api.get<{ data: Exchange }>(`/echanges/client/echanges/${id}`).then((r) => r.data),
  create: (payload: EchangeInput): Promise<Exchange> =>
    api.post<{ data: Exchange }>('/echanges/client/echanges', payload).then((r) => r.data),
  update: (id: number, payload: Partial<Omit<EchangeInput, 'type'>>): Promise<Exchange> =>
    api.put<{ data: Exchange }>(`/echanges/client/echanges/${id}`, payload).then((r) => r.data),
  remove: (id: number): Promise<void> =>
    api.del(`/echanges/client/echanges/${id}`).then(() => undefined),
};

// Praticien's own échanges — same shape as exchangeRepo, keyed on praticien_id server-side.
export const praticienExchangeRepo = {
  list: (): Promise<Exchange[]> =>
    api.get<{ data: Exchange[] }>('/echanges/praticien/echanges?per_page=50').then((r) => r.data),
  byId: (id: number): Promise<Exchange> =>
    api.get<{ data: Exchange }>(`/echanges/praticien/echanges/${id}`).then((r) => r.data),
  create: (payload: EchangeInput): Promise<Exchange> =>
    api.post<{ data: Exchange }>('/echanges/praticien/echanges', payload).then((r) => r.data),
  update: (id: number, payload: Partial<Omit<EchangeInput, 'type'>>): Promise<Exchange> =>
    api.put<{ data: Exchange }>(`/echanges/praticien/echanges/${id}`, payload).then((r) => r.data),
  remove: (id: number): Promise<void> =>
    api.del(`/echanges/praticien/echanges/${id}`).then(() => undefined),
};

// Community board — every visible échange from every client/praticien, with auteur_nom/
// auteur_type/est_a_moi attached server-side. Available to any authenticated client or praticien.
export const echangeCommunityRepo = {
  list: (): Promise<Exchange[]> =>
    api.get<{ data: Exchange[] }>('/echanges/community?per_page=50').then((r) => r.data),
  byId: (id: number): Promise<Exchange> =>
    api.get<{ data: Exchange }>(`/echanges/community/${id}`).then((r) => r.data),
};

// ---------- Paiements (payment history) — real backend ----------
export const paiementRepo = {
  list: (): Promise<PaymentRecord[]> =>
    api.get<{ data: PaymentRecord[] }>('/paiements/clients?per_page=50').then((r) => r.data),
  byId: (id: number): Promise<PaymentRecord> =>
    api.get<{ data: PaymentRecord }>(`/paiements/${id}`).then((r) => r.data),
};

// ---------- Remboursements (refunds) — real backend ----------
export const remboursementRepo = {
  list: (): Promise<Remboursement[]> =>
    api.get<{ data: Remboursement[] }>('/remboursements/client?per_page=50').then((r) => r.data),
  create: (payload: { paiement_id: number; motif: string; description?: string }): Promise<Remboursement> => {
    const fd = new FormData();
    fd.append('paiement_id', String(payload.paiement_id));
    fd.append('motif', payload.motif);
    if (payload.description) fd.append('description', payload.description);
    return api.post<{ data: Remboursement }>('/remboursements/client', fd).then((r) => r.data);
  },
  byId: (id: number): Promise<Remboursement> =>
    api.get<{ data: Remboursement }>(`/remboursements/client/${id}`).then((r) => r.data),
  cancel: (id: number): Promise<Remboursement> =>
    api.post<{ data: Remboursement }>(`/remboursements/client/${id}/cancel`).then((r) => r.data),
};

// ---------- Messaging (real backend) ----------

function conversationTimestamp(row: any): string {
  return row.last_message?.created_at ?? row.updated_at ?? row.created_at;
}

export function mapConversationAsClient(row: any): Conversation {
  const p = row.praticien;
  return {
    id: String(row.id),
    name: p ? `${p.firstname} ${p.lastname}`.trim() : 'Praticien',
    avatar: DEFAULT_GRADIENT,
    photo: undefined,
    preview: row.last_message?.text ?? 'Démarrez la conversation…',
    when: dateFr(conversationTimestamp(row)),
    unread: (row.unread_count ?? 0) > 0,
    online: false,
  };
}

export function mapConversationAsPraticien(row: any): Conversation {
  const c = row.client;
  return {
    id: String(row.id),
    name: c ? `${c.firstname} ${c.lastname}`.trim() : 'Client',
    avatar: DEFAULT_GRADIENT,
    photo: undefined,
    preview: row.last_message?.text ?? 'Démarrez la conversation…',
    when: dateFr(conversationTimestamp(row)),
    unread: (row.unread_count ?? 0) > 0,
    online: false,
  };
}

export function mapMessage(row: any, viewerRole: 'client' | 'praticien'): ChatMessage {
  const d = new Date(row.created_at);
  const time = Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    id: String(row.id),
    fromMe: row.sender_role === viewerRole,
    text: row.text,
    time,
    createdAtIso: row.created_at,
  };
}

export const messageRepo = {
  conversations: (): Promise<Conversation[]> =>
    api.get<{ data: any[] }>('/client/conversations').then((res) => res.data.map(mapConversationAsClient)),
  conversation: (id: string): Promise<Conversation | undefined> =>
    api.get<{ data: any }>(`/client/conversations/${id}`).then((res) => mapConversationAsClient(res.data)).catch(() => undefined),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    api.get<{ data: any[] }>(`/client/conversations/${conversationId}/messages`)
      .then((res) => res.data.map((m) => mapMessage(m, 'client'))),
  send: (conversationId: string, text: string): Promise<ChatMessage> =>
    api.post<{ data: any }>(`/client/conversations/${conversationId}/messages`, { text })
      .then((res) => mapMessage(res.data, 'client')),
  // Creates (or reuses) the conversation with a praticien. No `text` here —
  // the caller lands on the chat screen and types the opening message there,
  // same flow as any other conversation. Used by praticien/[id].tsx's
  // "Contacter" button.
  startConversation: (praticienId: number): Promise<Conversation> =>
    api.post<{ data: { conversation: any } }>('/client/conversations', { praticien_id: praticienId })
      .then((res) => mapConversationAsClient(res.data.conversation)),
};

export const praticienMessageRepo = {
  conversations: (): Promise<Conversation[]> =>
    api.get<{ data: any[] }>('/praticien/conversations').then((res) => res.data.map(mapConversationAsPraticien)),
  conversation: (id: string): Promise<Conversation | undefined> =>
    api.get<{ data: any }>(`/praticien/conversations/${id}`).then((res) => mapConversationAsPraticien(res.data)).catch(() => undefined),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    api.get<{ data: any[] }>(`/praticien/conversations/${conversationId}/messages`)
      .then((res) => res.data.map((m) => mapMessage(m, 'praticien'))),
  send: (conversationId: string, text: string): Promise<ChatMessage> =>
    api.post<{ data: any }>(`/praticien/conversations/${conversationId}/messages`, { text })
      .then((res) => mapMessage(res.data, 'praticien')),
};

// ---------- Peer messages (praticien-to-praticien) — real backend ----------
// Unlike client<->praticien chat, both sides here are practitioners, so "who sent this"
// can't be told apart by role — the backend attaches `other` (the other participant) on
// each conversation and `from_me` on each message.
export function mapPeerConversation(row: any): Conversation {
  const other = row.other;
  return {
    id: String(row.id),
    name: other ? `${other.firstname} ${other.lastname}`.trim() : 'Praticien',
    avatar: DEFAULT_GRADIENT,
    photo: undefined,
    preview: row.last_message?.text ?? 'Démarrez la conversation…',
    when: dateFr(conversationTimestamp(row)),
    unread: (row.unread_count ?? 0) > 0,
    online: false,
  };
}

export function mapPeerMessage(row: any): ChatMessage {
  const d = new Date(row.created_at);
  const time = Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    id: String(row.id),
    fromMe: Boolean(row.from_me),
    text: row.text,
    time,
    createdAtIso: row.created_at,
  };
}

export const peerMessageRepo = {
  conversations: (): Promise<Conversation[]> =>
    api.get<{ data: any[] }>('/praticien/peer-conversations').then((res) => res.data.map(mapPeerConversation)),
  conversation: (id: string): Promise<Conversation | undefined> =>
    api.get<{ data: any }>(`/praticien/peer-conversations/${id}`).then((res) => mapPeerConversation(res.data)).catch(() => undefined),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    api.get<{ data: any[] }>(`/praticien/peer-conversations/${conversationId}/messages`)
      .then((res) => res.data.map(mapPeerMessage)),
  send: (conversationId: string, text: string): Promise<ChatMessage> =>
    api.post<{ data: any }>(`/praticien/peer-conversations/${conversationId}/messages`, { text })
      .then((res) => mapPeerMessage(res.data)),
  // Creates (or reuses) the conversation with another praticien; lands the caller on the
  // chat screen with no opening message, same pattern as messageRepo.startConversation.
  startConversation: (peerId: number): Promise<Conversation> =>
    api.post<{ data: { conversation: any } }>('/praticien/peer-conversations', { peer_id: peerId })
      .then((res) => mapPeerConversation(res.data.conversation)),
};

// ---------- Client self-profile (real backend, GET /client/profile) ----------
export interface ClientProfile {
  firstname: string;
  lastname: string;
  email: string;
  city: string;
  phone: string | null;
}

export const clientProfileRepo = {
  me: (): Promise<ClientProfile> =>
    api.get<{ data: { client: ClientProfile } }>('/client/profile').then((res) => res.data.client),
};

// ---------- Praticien self-profile (real backend, GET /praticien/profile) ----------
interface PraticienProfile {
  id: number;
  firstname: string;
  lastname: string;
  statut_verification: 'en_attente' | 'en_cours' | 'valide' | 'rejete';
  motif_rejet: string | null;
  documents_stats: { total: number; en_attente: number; valide: number; rejete: number };
}

export const praticienProfileRepo = {
  me: (): Promise<PraticienProfile> =>
    api.get<{ data: { praticien: PraticienProfile; documents_stats: PraticienProfile['documents_stats'] } }>('/praticien/profile')
      .then((res) => ({ ...res.data.praticien, documents_stats: res.data.documents_stats })),
};

// ---------- Praticien registration (real backend, multipart POST /praticien/register) ----------
// DOC_TYPES must match server/src/auth/praticien-auth/praticien-auth.service.ts's DOC_TYPES
// exactly — the backend rejects the request if any `documents[type]` field is missing.
const DOC_TYPES = ['piece_identite', 'diplome', 'charte'] as const;

export const praticienAuthRepo = {
  register: (draft: PraticienRegistrationDraft): Promise<{ token: string }> => {
    const fd = new FormData();
    const fields: Array<[string, string | number | undefined]> = [
      ['firstname', draft.firstname], ['lastname', draft.lastname], ['email', draft.email],
      ['password', draft.password], ['password_confirmation', draft.password],
      ['siret', draft.siret],
      ['telephone', draft.telephone], ['ville', draft.ville], ['niveau', draft.niveau],
      ['specialite', draft.specialite], ['mode', draft.mode], ['tarif', draft.tarif],
      ['experience', draft.experience], ['bio', draft.bio],
    ];
    for (const [key, value] of fields) {
      if (value !== undefined) fd.append(key, String(value));
    }
    for (const type of DOC_TYPES) {
      const doc = draft.documents?.[type];
      if (doc) {
        // React Native's fetch polyfill accepts this {uri, name, type} shape for a
        // FormData file entry — there is no real Blob/File available on-device.
        fd.append(`documents[${type}]`, { uri: doc.uri, name: doc.name, type: doc.mimeType } as any);
      }
    }
    return api.post<{ data: { token: string } }>('/praticien/register', fd).then((res) => res.data);
  },
};

// ---------- Promotions (real backend, POST /promotions/validate) ----------
export interface PromotionValidation {
  id: number;
  code: string;
  type: 'pourcentage' | 'fixe';
  valeur: number;
}

export const promotionRepo = {
  // Throws (404 "Code promo invalide ou expiré") on an unknown/expired code — same
  // validation RendezVousService.create() runs server-side when promotion_code is passed,
  // so a code accepted here is guaranteed to still apply at booking time.
  validate: (code: string): Promise<PromotionValidation> =>
    api.post<{ data: PromotionValidation }>('/promotions/validate', { code }).then((res) => res.data),
};

// ---------- Rendez-vous (real backend) ----------
interface CreateRendezVousParams {
  praticien_id: number;
  date_heure: string;
  mode: 'présentiel' | 'visio';
  promotion_code?: string;
}

export const rendezVousRepo = {
  create: (params: CreateRendezVousParams): Promise<{ rendez_vous: RendezVous; client_secret: string }> =>
    api
      .post<{ status: string; data: { rendez_vous: RendezVous; client_secret: string } }>('/rendez-vous', params)
      .then((res) => res.data),

  list: (): Promise<RendezVous[]> =>
    api.get<{ data: RendezVous[] }>('/rendez-vous/client?per_page=100').then((res) => res.data),

  byId: (id: number): Promise<RendezVous> =>
    api.get<{ status: string; data: RendezVous }>(`/rendez-vous/client/${id}`).then((res) => res.data),

  cancel: (id: number): Promise<RendezVous> =>
    api.post<{ status: string; data: RendezVous }>(`/rendez-vous/client/${id}/cancel`).then((res) => res.data),

  // Praticien-facing: the current praticien's booked appointments (client joined),
  // ordered soonest-first.
  praticienList: (): Promise<RendezVous[]> =>
    api.get<{ data: RendezVous[] }>('/praticien/rendez-vous?per_page=100').then((res) => res.data),
};

// ---------- Subscriptions (praticien billing) — real backend ----------
export const subscriptionRepo = {
  current: (): Promise<Subscription> =>
    api.get<{ status: string; data: Subscription }>('/praticien/subscription').then((res) => res.data),

  checkout: (plan: 'pro' | 'premium'): Promise<{ url: string }> =>
    api
      .post<{ status: string; data: { url: string } }>('/praticien/subscription/checkout', { plan })
      .then((res) => res.data),

  cancel: (): Promise<Subscription> =>
    api.post<{ status: string; data: Subscription }>('/praticien/subscription/cancel').then((res) => res.data),
};

// ---------- Stripe Connect (praticien payouts) — real backend ----------
export const stripeConnectRepo = {
  status: (): Promise<StripeConnectStatus> =>
    api.get<{ status: string; data: StripeConnectStatus }>('/praticien/stripe/connect/status').then((res) => res.data),
  onboard: (): Promise<{ url: string }> =>
    api.post<{ status: string; data: { url: string } }>('/praticien/stripe/connect/onboard').then((res) => res.data),
};
