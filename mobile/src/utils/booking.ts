/**
 * Turns the picker's `day.date` ('YYYY-MM-DD') + `slot` label into a real ISO datetime
 * for the backend.
 *
 * The slot comes from GET /praticiens/:id/availability, whose grid times use a colon
 * ('09:00', '14:00'); older/web labels use the French 'XhYY' form ('9h00'). Accept BOTH
 * separators — the previous 'XhYY'-only regex silently failed on the real colon times and
 * fell back to 00:00, so every booking was stored at midnight and never actually held the
 * chosen slot (it stayed "available" and could be rebooked).
 *
 * The 'Z' pins the instant to UTC so the stored hour matches the availability grid, which
 * keys taken slots by UTC getters — otherwise a non-UTC server would shift the hour and
 * the slot would never register as taken.
 */
export function buildDateHeureIso(date: string, slot: string): string {
  const match = /^(\d{1,2})[h:](\d{2})$/.exec(slot);
  const hh = (match?.[1] ?? '00').padStart(2, '0');
  const mm = match?.[2] ?? '00';
  return `${date}T${hh}:${mm}:00Z`;
}
