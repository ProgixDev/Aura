import { describe, it, expect } from 'vitest';
import { computeDiscountedTarif } from './pricing';

describe('computeDiscountedTarif', () => {
  it('returns the original price when there is no promo', () => {
    expect(computeDiscountedTarif(80, null)).toBe(80);
  });

  it('applies a percentage discount', () => {
    expect(computeDiscountedTarif(80, { type: 'pourcentage', valeur: 10 })).toBe(72);
  });

  it('applies a fixed discount', () => {
    expect(computeDiscountedTarif(80, { type: 'fixe', valeur: 15 })).toBe(65);
  });

  it('clamps a fixed discount larger than the price to 0', () => {
    expect(computeDiscountedTarif(10, { type: 'fixe', valeur: 25 })).toBe(0);
  });

  it('clamps a pathological >100% percentage discount to 0 (the backend only clamps the fixed branch — see RendezVousService.create in Task 3 — so this client-side preview is deliberately more conservative; it must never show a negative estimate)', () => {
    expect(computeDiscountedTarif(80, { type: 'pourcentage', valeur: 150 })).toBe(0);
  });
});
