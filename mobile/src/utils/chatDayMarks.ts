import type { ChatMessage } from '../data/types';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// UTC getters throughout (not local getters): both real message timestamps
// (ISO strings from the server) and this function's test fixtures are UTC,
// so comparing on UTC calendar-day boundaries keeps this deterministic
// regardless of the host machine's local timezone.
function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/**
 * Returns a copy of `messages` with `dayMark` set on the first message of
 * each calendar day ("Aujourd'hui" / "Hier" / "DD mon."), matching the
 * separators the chat UI has always shown. Pure and side-effect free so the
 * chat screen can call it on every render without maintaining extra state.
 */
export function withDayMarks(messages: ChatMessage[], now: Date = new Date()): ChatMessage[] {
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  let lastKey: string | null = null;
  return messages.map((m) => {
    const created = new Date(m.createdAtIso);
    const key = dayKey(created);
    let dayMark: string | undefined;
    if (key !== lastKey) {
      dayMark = key === todayKey
        ? "Aujourd'hui"
        : key === yesterdayKey
          ? 'Hier'
          : `${created.getUTCDate()} ${MONTHS[created.getUTCMonth()]}`;
      lastKey = key;
    }
    return { ...m, dayMark };
  });
}
