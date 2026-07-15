// Timezone note: TypeORM's better-sqlite3 driver (the e2e test DB) always serializes
// `datetime` columns to UTC on write (DateUtils.mixedDateToUtcDatetimeString), regardless
// of what timezone the Date object was constructed in. The production mysql2 driver
// instead serializes Date objects using the Node process's local timezone. To keep the
// month/week bucketing below internally consistent — and correct against both drivers —
// every boundary computed here uses UTC. This is exactly correct against sqlite, and is
// exactly correct in production as long as the server process runs with `TZ=UTC` (the
// standard practice for Node backends; if the deployed server does not run in UTC, set
// `TZ=UTC` in its environment rather than reworking this file).

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round1(((current - previous) / previous) * 100);
}

export function monthBounds(year: number, month0: number): { start: Date; endInclusive: Date } {
  return {
    start: new Date(Date.UTC(year, month0, 1, 0, 0, 0, 0)),
    endInclusive: new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59, 999)),
  };
}

export function currentYearMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' + integer month offset (may be negative) -> 'YYYY-MM'. Pure string/integer math. */
export function addMonthsToYearMonth(ym: string, offset: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + offset;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/** Monday 00:00:00.000 UTC of the current ISO week, through the following Monday (exclusive). */
export function currentWeekRange(now = new Date()): { start: Date; end: Date } {
  const day = now.getUTCDay(); // 0=Sunday..6=Saturday
  const isoDay = day === 0 ? 7 : day; // 1=Monday..7=Sunday
  const start = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (isoDay - 1), 0, 0, 0, 0,
  ));
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Parses a datetime value coming back from a *raw* query result (`getRawMany`/`getRawOne`,
 * including aggregates like `MIN(...)`) into a Date representing the correct UTC instant.
 *
 * Raw query results bypass TypeORM's column hydration. On the better-sqlite3 driver, a
 * `datetime` column comes back from a raw select as a bare `"YYYY-MM-DD HH:MM:SS.mmm"` string
 * with no timezone marker — even though the column is stored in UTC (see the driver note at the
 * top of this file), `new Date(...)` on that bare string parses it in the process's *local*
 * timezone, silently shifting the instant by the local UTC offset. This can flip which
 * day/weekday bucket a timestamp lands in. TypeORM's own entity hydration path avoids this by
 * inserting a 'T' and trailing 'Z' before parsing (AbstractSqliteDriver#prepareHydratedValue);
 * this function applies the identical fix so raw/aggregate results behave the same way. Values
 * the driver already parsed into a Date (e.g. mysql2 in production) pass through unchanged.
 */
export function parseRawDatetime(value: string | Date): Date {
  if (value instanceof Date) return value;
  let v = value;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)) v = v.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(v)) v += 'Z';
  return new Date(v);
}

/** Buckets a list of Dates into 7 Mon..Sun counts, relative to `weekStart` (must be a Monday 00:00 UTC). */
export function bucketByWeekday(dates: Date[], weekStart: Date): { jour: string; count: number }[] {
  const counts = new Array(7).fill(0);
  for (const d of dates) {
    const diffDays = Math.floor((d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) counts[diffDays] += 1;
  }
  return WEEKDAY_LABELS.map((jour, i) => ({ jour, count: counts[i] }));
}
