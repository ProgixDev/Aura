import { isValidSiret } from './siret';

describe('isValidSiret', () => {
  it('accepts a 14-digit number whose checksum digit is correct', () => {
    expect(isValidSiret('12345678901237')).toBe(true);
    expect(isValidSiret('98765432100122')).toBe(true);
  });

  it('rejects a 14-digit number with a wrong checksum digit', () => {
    expect(isValidSiret('12345678901234')).toBe(false);
  });

  it('rejects non-14-digit or non-numeric input', () => {
    expect(isValidSiret('1234567890123')).toBe(false);
    expect(isValidSiret('123456789012345')).toBe(false);
    expect(isValidSiret('1234567890123a')).toBe(false);
    expect(isValidSiret('')).toBe(false);
  });
});
