import { describe, it, expect } from 'vitest';
import { mapPraticien } from './praticien-adapter';

describe('mapPraticien', () => {
  const row = {
    id: 7, firstname: 'Elodie', lastname: 'Marceau', ville: 'Annecy',
    mode: 'présentiel', tarif: '75.00', niveau: 'expert', specialite: 'Magnétisme',
    bio: 'Bio réelle.', experience: 14, statut_verification: 'valide',
  };

  it('maps real fields directly', () => {
    const p = mapPraticien(row);
    expect(p.id).toBe(7);
    expect(p.name).toBe('Elodie Marceau');
    expect(p.city).toBe('Annecy');
    expect(p.price).toBe(75);
    expect(p.specialties).toEqual(['Magnétisme']);
    expect(p.bio).toBe('Bio réelle.');
    expect(p.experience.years).toBe(14);
  });

  it('derives verified from statut_verification, never fabricates a rating', () => {
    expect(mapPraticien(row).verified).toBe(true);
    expect(mapPraticien({ ...row, statut_verification: 'en_attente' }).verified).toBe(false);
    expect(mapPraticien(row).rating).toBe(0);
    expect(mapPraticien(row).reviews).toBe(0);
  });

  it('leaves fields with no backend source empty rather than fabricated', () => {
    const p = mapPraticien(row);
    expect(p.photo).toBeNull();
    expect(p.gallery).toEqual([]);
    expect(p.exchange).toBeNull();
  });
});
