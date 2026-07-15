import { filterEvents } from './filterEvents';
import type { Event } from '../data/types';

const retreat: Event = {
  id: 'e1', title: 'Retraite équinoxe', kind: 'RETRAITE · 3 JOURS', when: '21–23 mars',
  where: 'Drôme', price: 'à partir de 480 €', priceFrom: 480, gradient: ['#A8C8E8', '#C4B0E8'] as const,
};
const soiree: Event = {
  id: 'e2', title: 'Bain sonore', kind: 'ÉVÉNEMENT · 2H', when: 'sam. 14 avril · 20h', where: 'Paris 11e',
  price: '35 €', priceFrom: 35, gradient: ['#C4B0E8', '#E4C896'] as const,
};
const formation: Event = {
  id: 'e3', title: 'Initiation au Reiki', kind: 'FORMATION · 2 JOURS', when: '4–5 mai', where: 'Annecy',
  price: '320 €', priceFrom: 320, gradient: ['#B8D4C2', '#A8C8E8'] as const,
};
const circle: Event = {
  id: 'e4', title: 'Cercle de femmes', kind: 'CERCLE · 3H', when: 'mar. 9 avril · 19h', where: 'Lyon',
  price: '25 €', priceFrom: 25, gradient: ['#E4C896', '#C4B0E8'] as const,
};

describe('filterEvents', () => {
  const all = [retreat, soiree, formation, circle];

  it('"soon" applies no filter', () => {
    expect(filterEvents(all, 'soon')).toEqual(all);
  });

  it('filters retraites by kind', () => {
    expect(filterEvents(all, 'retraites')).toEqual([retreat]);
  });

  it('filters cercles by kind', () => {
    expect(filterEvents(all, 'cercles')).toEqual([circle]);
  });

  it('filters formations by kind', () => {
    expect(filterEvents(all, 'formations')).toEqual([formation]);
  });

  it('returns an empty list when nothing matches ateliers', () => {
    expect(filterEvents(all, 'ateliers')).toEqual([]);
  });
});
