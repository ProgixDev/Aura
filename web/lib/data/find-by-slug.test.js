import { describe, it, expect } from 'vitest';
import { findBySlug } from './find-by-slug';

describe('findBySlug', () => {
  const list = [{ slug: 'reiki', nom: 'Reiki' }, { slug: 'hypnose', nom: 'Hypnose' }];

  it('returns the item whose slug matches', () => {
    expect(findBySlug(list, 'hypnose')).toEqual({ slug: 'hypnose', nom: 'Hypnose' });
  });

  it('returns undefined when no item matches', () => {
    expect(findBySlug(list, 'inconnu')).toBeUndefined();
  });

  it('returns undefined for an empty or missing list', () => {
    expect(findBySlug([], 'reiki')).toBeUndefined();
    expect(findBySlug(undefined, 'reiki')).toBeUndefined();
  });
});
