import { buildDateHeureIso } from './booking';

describe('buildDateHeureIso', () => {
  it('converts a zero-padded slot label into an ISO datetime', () => {
    expect(buildDateHeureIso('2025-03-26', '14h00')).toBe('2025-03-26T14:00:00');
  });

  it('pads a single-digit hour', () => {
    expect(buildDateHeureIso('2025-03-26', '9h00')).toBe('2025-03-26T09:00:00');
  });

  it('preserves a non-zero minute', () => {
    expect(buildDateHeureIso('2025-03-29', '21h15')).toBe('2025-03-29T21:15:00');
  });

  it('falls back to 00:00 for an unparseable slot rather than throwing', () => {
    expect(buildDateHeureIso('2025-03-26', 'invalid')).toBe('2025-03-26T00:00:00');
  });
});
