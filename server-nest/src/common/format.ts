export function numberFormat(n: number, decimals = 2): string {
  return Number(n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function euro(n: number): string {
  return `${numberFormat(n)} €`;
}

export function formatDateFr(d: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export function exportTimestamp(now = new Date()): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export function formatDateTimeFr(d: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

/**
 * Timezone-safe equivalent of Laravel's `after:today` validation rule.
 *
 * Compares calendar dates as plain `YYYY-MM-DD` strings rather than round
 * tripping through `new Date(...).toISOString()`, which would reparse a
 * naive datetime string (no `Z`/offset suffix, e.g. `2026-07-14T00:30:00`)
 * in the host's local timezone and could shift the extracted calendar day.
 * Slicing the input string directly avoids that mismatch entirely.
 */
export function isStrictlyAfterToday(dateStr: string): boolean {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateOnly = dateStr.slice(0, 10);
  return dateOnly > todayStr;
}
