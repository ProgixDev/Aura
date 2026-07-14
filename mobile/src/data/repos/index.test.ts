import { mapDiscipline, mapPraticien, mapEvent } from './index';

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

describe('mapEvent', () => {
  const row = {
    id: 4, titre: 'Retraite équinoxe', type: 'retraite', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: '120.00', nombre_places: 20, description: 'desc', status: 'publié',
  };

  it('maps real fields directly and stringifies the numeric id', () => {
    const e = mapEvent(row);
    expect(e.id).toBe('4');
    expect(e.title).toBe('Retraite équinoxe');
    expect(e.where).toBe('Lyon');
    expect(e.priceFrom).toBe(120);
  });

  it('maps real animateurs into hosts, defaults to an empty list otherwise', () => {
    const withHosts = mapEvent({ ...row, animateurs: [{ firstname: 'A', lastname: 'B', specialite: 'yoga' }] });
    expect(withHosts.hosts).toEqual([{ name: 'A B', spec: 'yoga', gradient: ['#C4B0E8', '#A8C8E8'] }]);
    expect(mapEvent(row).hosts).toEqual([]);
  });
});
