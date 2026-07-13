/**
 * Repository layer — every screen reads through these functions.
 * Frontend-only build: all reads are served from the in-memory mock data
 * in `src/data/mock/*`. If a backend is ever added, replace the body of each
 * function — screens never need to change.
 */
import { practitionersMock, reviewsMock } from '../mock/practitioners';
import { disciplinesMock } from '../mock/disciplines';
import { eventsMock } from '../mock/events';
import { exchangesMock } from '../mock/exchanges';
import { conversationsMock, sampleChat } from '../mock/messages';
import {
  practitionerImages,
  disciplineImageSource,
} from '../images';
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  Conversation,
  ChatMessage,
} from '../types';

const delay = <T>(value: T, ms = 60): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

// Attach registry images onto the plain mock objects.
const withImages = (p: Practitioner): Practitioner => {
  const imgs = practitionerImages[p.id];
  if (!imgs) return p;
  return { ...p, photo: imgs.avatar, hero: imgs.hero, gallery: imgs.gallery };
};

const decoratedPractitioners = practitionersMock.map(withImages);

const withDisciplineImage = (d: Discipline): Discipline => ({
  ...d,
  heroImage: disciplineImageSource(d.slug),
});

const decoratedDisciplines = disciplinesMock.map(withDisciplineImage);

// ---------- Practitioners ----------
export const practitionerRepo = {
  list: (): Promise<Practitioner[]> => delay(decoratedPractitioners),
  byId: (id: string): Promise<Practitioner | undefined> =>
    delay(decoratedPractitioners.find((p) => p.id === id)),
  byDiscipline: (disciplineName: string): Promise<Practitioner[]> =>
    delay(
      decoratedPractitioners.filter((p) =>
        p.specialties.includes(disciplineName)
      )
    ),
  recommended: (): Promise<Practitioner[]> =>
    delay(decoratedPractitioners.slice(0, 4)),
  reviewsFor: (practitionerId: string) =>
    delay(reviewsMock.filter((r) => r.practitionerId === practitionerId)),
};

// ---------- Disciplines ----------
export const disciplineRepo = {
  list: (): Promise<Discipline[]> => delay(decoratedDisciplines),
  bySlug: (slug: string): Promise<Discipline | undefined> =>
    delay(decoratedDisciplines.find((d) => d.slug === slug)),
};

// ---------- Events ----------
export const eventRepo = {
  list: (): Promise<Event[]> => delay(eventsMock),
  byId: (id: string): Promise<Event | undefined> =>
    delay(eventsMock.find((e) => e.id === id)),
  featured: (): Promise<Event[]> => delay(eventsMock.slice(0, 2)),
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
