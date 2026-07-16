import { mapDiscipline, mapPraticien, mapEvent, mapCircle, mapArticle } from './index';

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

  it('wraps photo/hero/gallery URLs as {uri} when the backend provides them', () => {
    const p = mapPraticien({ ...row, photo: 'https://x/photo.png', hero: 'https://x/hero.png', gallery: ['https://x/g1.png'] });
    expect(p.photo).toEqual({ uri: 'https://x/photo.png' });
    expect(p.hero).toEqual({ uri: 'https://x/hero.png' });
    expect(p.gallery).toEqual([{ uri: 'https://x/g1.png' }]);
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

describe('mapCircle', () => {
  it('maps real fields verbatim and stringifies the numeric id', () => {
    const row = { id: 3, nom: 'Cercle Aura — Paris', description: 'Un espace de partage.', color: '#7B5FCF', animateur: 'Camille Rossi' };
    expect(mapCircle(row)).toEqual({
      id: '3', nom: 'Cercle Aura — Paris', description: 'Un espace de partage.', color: '#7B5FCF', animateur: 'Camille Rossi',
    });
  });

  it('passes through null fields as-is', () => {
    const row = { id: 5, nom: 'Cercle sans détails', description: null, color: null, animateur: null };
    expect(mapCircle(row)).toEqual({ id: '5', nom: 'Cercle sans détails', description: null, color: null, animateur: null });
  });
});

describe('mapArticle', () => {
  const row = {
    id: 9, slug: 'preparer-premiere-seance', titre: 'Préparer sa première séance',
    categorie: 'Conseils', tonalite: 'sage', extrait: 'extrait réel', corps: 'corps réel',
    status: 'publié', auteur: "L'équipe Aura", temps_lecture: 4,
    image_couverture: null, meta_description: null, mot_clef: null, date_publication: '2026-04-30T00:00:00.000Z',
  };

  it('maps every field verbatim and stringifies the numeric id', () => {
    expect(mapArticle(row)).toEqual({ ...row, id: '9' });
  });
});
