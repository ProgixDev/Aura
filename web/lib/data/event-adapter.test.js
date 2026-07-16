import { describe, it, expect } from 'vitest';
import { formatEventDates, mapEvent } from './event-adapter';

describe('formatEventDates', () => {
  it('formats a single date', () => {
    expect(formatEventDates(['2026-08-01'])).toBe('1 août');
  });

  it('formats a date range', () => {
    expect(formatEventDates(['2026-08-01', '2026-08-03'])).toBe('1 août – 3 août');
  });

  it('returns an empty string for no dates', () => {
    expect(formatEventDates([])).toBe('');
    expect(formatEventDates(undefined)).toBe('');
  });
});

describe('mapEvent', () => {
  const row = {
    id: 4, titre: 'Retraite équinoxe', type: 'retraite', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: '120.00', nombre_places: 20, description: 'desc', status: 'publié',
  };

  it('maps real backend fields directly', () => {
    const e = mapEvent(row);
    expect(e.id).toBe(4);
    expect(e.title).toBe('Retraite équinoxe');
    expect(e.kind).toBe('RETRAITE');
    expect(e.where).toBe('Lyon');
    expect(e.price).toBe('120 €');
    expect(e.priceFrom).toBe(120);
    expect(e.seats).toBe(20);
  });

  it('never triggers the low-availability badge (no bookings backend yet)', () => {
    expect(mapEvent(row).seatsLeft <= 5).toBe(false);
  });

  it('leaves image null with no backend source, passes it through when present', () => {
    expect(mapEvent(row).image).toBeNull();
    expect(mapEvent({ ...row, image: 'https://x/cover.jpg' }).image).toBe('https://x/cover.jpg');
  });
});
