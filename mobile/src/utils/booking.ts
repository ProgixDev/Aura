/**
 * The mobile day/slot picker (`app/booking/slot.tsx`) is UI-only mock content (R3: no
 * calendar/availability engine in this plan) — `day.date` is already an ISO-shaped
 * 'YYYY-MM-DD' string, but `slot` is a French-style 'XhYY' label (e.g. '9h00', '14h30'),
 * not a valid time string. This converts what's already selected into a real ISO datetime
 * for the backend, without changing the picker itself — mirrors web's `buildDateHeureIso`
 * in `BookingFlow.jsx` (Task 9), adapted for mobile's 'XhYY' slot format instead of French
 * month names.
 */
export function buildDateHeureIso(date: string, slot: string): string {
  const match = /^(\d{1,2})h(\d{2})$/.exec(slot);
  const hh = (match?.[1] ?? '00').padStart(2, '0');
  const mm = match?.[2] ?? '00';
  return `${date}T${hh}:${mm}:00`;
}
