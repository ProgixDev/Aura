import { mapDiscipline, mapPraticien } from './index';

describe('mapPraticien', () => {
  const row = {
    id: 7, firstname: 'Elodie', lastname: 'Marceau', ville: 'Annecy',
    mode: 'présentiel', tarif: '75.00', niveau: 'expert', specialite: 'Magnétisme',
    bio: 'Bio réelle.', experience: 14, statut_verification: 'valide',
  };

  it('maps real fields directly and stringifies the numeric id', () => {
    const p = mapPraticien(row);
    expect(p.id).toBe('7');
    expect(p.name).toBe('Elodie Marceau');
    expect(p.city).toBe('Annecy');
    expect(p.price).toBe(75);
    expect(p.specialties).toEqual(['Magnétisme']);
    expect(p.experience?.years).toBe(14);
  });

  it('derives verified from statut_verification, never fabricates a rating', () => {
    expect(mapPraticien(row).verified).toBe(true);
    expect(mapPraticien({ ...row, statut_verification: 'en_attente' }).verified).toBe(false);
    expect(mapPraticien(row).rating).toBe(0);
    expect(mapPraticien(row).reviews).toBe(0);
  });

  it('leaves photo/hero/gallery empty rather than borrowing a stock photo', () => {
    const p = mapPraticien(row);
    expect(p.photo).toBeUndefined();
    expect(p.gallery).toEqual([]);
  });
});

describe('mapDiscipline', () => {
  const row = { id: 2, nom: 'Reiki', slug: 'reiki', tonalite: 'une-valeur-libre', glyphe: '❍', accroche: 'Accroche réelle' };

  it('maps real fields directly', () => {
    const d = mapDiscipline(row);
    expect(d.slug).toBe('reiki');
    expect(d.name).toBe('Reiki');
    expect(d.glyph).toBe('❍');
    expect(d.intro).toBe('Accroche réelle');
  });

  it('always uses a valid tone key, never the freeform backend value', () => {
    const validTones = ['sky', 'violet', 'sage', 'gold'];
    expect(validTones).toContain(mapDiscipline(row).tone);
  });

  it('never fabricates a praticien count', () => {
    expect(mapDiscipline(row).count).toBe(0);
  });
});
