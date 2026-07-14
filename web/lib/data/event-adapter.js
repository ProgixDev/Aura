// Adapter: backend Event rows -> the shape EventCard / event pages already
// render. Fields with no backend source (tone, program, seatsLeft) get an
// honest neutral value instead of invented data — see plan Architecture notes.
const DEFAULT_TONE = 'violet';

export function formatEventDates(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return '';
  const fmt = (iso) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
  if (dates.length === 1) return fmt(dates[0]);
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

export function mapEvent(row) {
  const when = formatEventDates(row.dates);
  return {
    id: row.id,
    tone: DEFAULT_TONE,
    kind: (row.type || '').toUpperCase(),
    title: row.titre,
    when,
    where: row.lieu,
    price: `${Math.round(Number(row.prix))} €`,
    priceFrom: Number(row.prix),
    seats: row.nombre_places,
    // No bookings/registrations backend yet (Plan 05) — Infinity keeps the
    // "places restantes" warning from ever firing on data we don't have.
    seatsLeft: Number.POSITIVE_INFINITY,
    description: row.description,
    meta: { dates: when, place: row.lieu, seats: row.nombre_places },
    program: null,
  };
}
