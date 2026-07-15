import type { Practitioner } from '../data/types';

/**
 * Case-insensitive substring match against name, city, and specialties.
 * Mirrors the matching approach in web/app/(site)/praticiens/page.jsx
 * (join the searchable fields into one lowercase string, then a plain
 * `includes` check), adapted to the mobile `Practitioner` shape, which
 * has no `region`/`extraSpecialty` fields.
 */
export function filterPractitioners(list: Practitioner[], query: string): Practitioner[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((p) => {
    const haystack = [p.name, p.city, ...p.specialties].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
