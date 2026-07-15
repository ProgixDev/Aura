import type { Event } from '../data/types';

export type EventFilter = 'soon' | 'retraites' | 'cercles' | 'formations' | 'ateliers';

const KIND_MATCH: Record<Exclude<EventFilter, 'soon'>, string> = {
  retraites: 'RETRAITE',
  cercles: 'CERCLE',
  formations: 'FORMATION',
  ateliers: 'ATELIER',
};

/**
 * 'soon' (the screen's default) means "no category filter, show
 * everything" — it is not one of the four category chips. The other four
 * values match Event.kind case-insensitively against the category
 * keyword (kind is a free-text label like "RETRAITE · 3 JOURS").
 */
export function filterEvents(events: Event[], filter: EventFilter): Event[] {
  if (filter === 'soon') return events;
  const needle = KIND_MATCH[filter];
  return events.filter((e) => e.kind.toUpperCase().includes(needle));
}
