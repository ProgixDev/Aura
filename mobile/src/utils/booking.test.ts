import { buildDateHeureIso } from './booking';

describe('buildDateHeureIso', () => {
  it('converts a colon slot label (the availability grid format) into a UTC ISO datetime', () => {
    expect(buildDateHeureIso('2025-03-26', '14:00')).toBe('2025-03-26T14:00:00Z');
  });

  it('also accepts the French XhYY label form', () => {
    expect(buildDateHeureIso('2025-03-26', '14h00')).toBe('2025-03-26T14:00:00Z');
  });

  it('pads a single-digit hour', () => {
    expect(buildDateHeureIso('2025-03-26', '9:00')).toBe('2025-03-26T09:00:00Z');
  });

  it('preserves a non-zero minute', () => {
    expect(buildDateHeureIso('2025-03-29', '21:15')).toBe('2025-03-29T21:15:00Z');
  });

  it('falls back to 00:00 for an unparseable slot rather than throwing', () => {
    expect(buildDateHeureIso('2025-03-26', 'invalid')).toBe('2025-03-26T00:00:00Z');
  });
});
