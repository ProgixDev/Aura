import { filterPractitioners } from './filterPractitioners';
import type { Practitioner } from '../data/types';

const base: Practitioner = {
  id: 'p1',
  name: 'Élodie Marceau',
  specialties: ['Magnétisme', 'Reiki'],
  city: 'Annecy',
  mode: 'présentiel',
  price: 70,
  rating: 4.9,
  reviews: 12,
  level: 'Expert',
  verified: true,
  bio: 'Praticienne en magnétisme depuis 10 ans.',
  gradient: ['#C4B0E8', '#A8C8E8'] as const,
};

const other: Practitioner = {
  ...base,
  id: 'p2',
  name: 'Mathieu Vernet',
  specialties: ['Chamanisme'],
  city: 'Lyon',
};

describe('filterPractitioners', () => {
  it('returns everything when the query is blank', () => {
    expect(filterPractitioners([base, other], '')).toEqual([base, other]);
    expect(filterPractitioners([base, other], '   ')).toEqual([base, other]);
  });

  it('matches by name, case-insensitively', () => {
    expect(filterPractitioners([base, other], 'élodie')).toEqual([base]);
  });

  it('matches by city', () => {
    expect(filterPractitioners([base, other], 'lyon')).toEqual([other]);
  });

  it('matches by specialty', () => {
    expect(filterPractitioners([base, other], 'chamanisme')).toEqual([other]);
  });

  it('excludes practitioners that match nothing', () => {
    expect(filterPractitioners([base, other], 'hypnose')).toEqual([]);
  });
});
