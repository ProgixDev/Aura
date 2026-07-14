import { buildEchangeSujet } from './echange';

describe('buildEchangeSujet', () => {
  it('combines propose and recherche when both are given', () => {
    expect(buildEchangeSujet('1 soin Reiki', 'Cours de yoga')).toBe('Échange : 1 soin Reiki contre Cours de yoga');
  });
  it('falls back to propose only', () => {
    expect(buildEchangeSujet('1 soin Reiki', '')).toBe('Je propose : 1 soin Reiki');
  });
  it('falls back to recherche only', () => {
    expect(buildEchangeSujet('', 'Cours de yoga')).toBe('Je recherche : Cours de yoga');
  });
  it('falls back to a generic subject when both are empty', () => {
    expect(buildEchangeSujet('', '')).toBe('Échange');
    expect(buildEchangeSujet(undefined, undefined)).toBe('Échange');
  });
  it('trims whitespace and truncates to 255 characters', () => {
    expect(buildEchangeSujet('  a  ', '  b  ')).toBe('Échange : a contre b');
    const long = 'x'.repeat(300);
    expect(buildEchangeSujet(long, '').length).toBe(255);
  });
});
