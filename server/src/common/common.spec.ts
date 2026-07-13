import { success, fail } from './envelope';
import { formatValidationErrors } from './validation';
import { numberFormat, formatDateFr, isStrictlyAfterToday, isOnOrAfterToday } from './format';
import { ValidationError } from 'class-validator';

describe('common helpers', () => {
  it('success builds Laravel envelope', () => {
    expect(success({ id: 1 }, 'ok')).toEqual({
      status: 'success',
      message: 'ok',
      data: { id: 1 },
    });
    expect(success([1, 2])).toEqual({ status: 'success', data: [1, 2] });
    expect(success({ id: 1 }, undefined, { pagination: { total: 0 } })).toEqual(
      {
        status: 'success',
        data: { id: 1 },
        pagination: { total: 0 },
      },
    );
  });

  it('fail builds error envelope', () => {
    expect(fail('nope')).toEqual({ status: 'error', message: 'nope' });
    expect(fail('nope', { error: 'x' })).toEqual({
      status: 'error',
      message: 'nope',
      error: 'x',
    });
  });

  it('formatValidationErrors flattens nested class-validator errors', () => {
    const child = new ValidationError();
    child.property = 'statut';
    child.constraints = { isIn: 'statut invalide' };
    const parent = new ValidationError();
    parent.property = 'documents';
    parent.children = [child];
    expect(formatValidationErrors([parent])).toEqual({
      'documents.statut': ['statut invalide'],
    });
  });

  it('numberFormat matches PHP number_format defaults', () => {
    expect(numberFormat(1234.5)).toBe('1,234.50');
    expect(numberFormat(0)).toBe('0.00');
  });

  it('numberFormat supports a custom decimals count', () => {
    expect(numberFormat(12.3456, 1)).toBe('12.3');
  });

  it('formatDateFr renders d/m/Y', () => {
    expect(formatDateFr(new Date(2026, 6, 3))).toBe('03/07/2026');
  });

  describe('isStrictlyAfterToday', () => {
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (n: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + n);
      return toDateStr(d);
    };

    it('returns false for today', () => {
      expect(isStrictlyAfterToday(addDays(0))).toBe(false);
    });

    it('returns false for yesterday', () => {
      expect(isStrictlyAfterToday(addDays(-1))).toBe(false);
    });

    it('returns true for tomorrow', () => {
      expect(isStrictlyAfterToday(addDays(1))).toBe(true);
    });

    it('extracts the calendar date via slicing for a naive datetime string (no Z/offset)', () => {
      // Should not be reparsed through `new Date(...)`, which would apply
      // the host's local timezone to a naive datetime and could shift the
      // calendar day. Slicing keeps the comparison timezone-independent.
      const tomorrow = addDays(1);
      expect(isStrictlyAfterToday(`${tomorrow}T00:30:00`)).toBe(true);

      const today = addDays(0);
      expect(isStrictlyAfterToday(`${today}T23:59:59`)).toBe(false);
    });
  });

  describe('isOnOrAfterToday', () => {
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (n: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + n);
      return toDateStr(d);
    };

    it('returns true for today', () => {
      expect(isOnOrAfterToday(addDays(0))).toBe(true);
    });

    it('returns false for yesterday', () => {
      expect(isOnOrAfterToday(addDays(-1))).toBe(false);
    });

    it('returns true for tomorrow', () => {
      expect(isOnOrAfterToday(addDays(1))).toBe(true);
    });
  });
});
