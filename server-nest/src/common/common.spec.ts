import { success, fail } from './envelope';
import { formatValidationErrors } from './validation';
import { numberFormat, formatDateFr } from './format';
import { ValidationError } from 'class-validator';

describe('common helpers', () => {
  it('success builds Laravel envelope', () => {
    expect(success({ id: 1 }, 'ok')).toEqual({ status: 'success', message: 'ok', data: { id: 1 } });
    expect(success([1, 2])).toEqual({ status: 'success', data: [1, 2] });
    expect(success({ id: 1 }, undefined, { pagination: { total: 0 } })).toEqual({
      status: 'success', data: { id: 1 }, pagination: { total: 0 },
    });
  });

  it('fail builds error envelope', () => {
    expect(fail('nope')).toEqual({ status: 'error', message: 'nope' });
    expect(fail('nope', { error: 'x' })).toEqual({ status: 'error', message: 'nope', error: 'x' });
  });

  it('formatValidationErrors flattens nested class-validator errors', () => {
    const child = new ValidationError();
    child.property = 'statut';
    child.constraints = { isIn: 'statut invalide' };
    const parent = new ValidationError();
    parent.property = 'documents';
    parent.children = [child];
    expect(formatValidationErrors([parent])).toEqual({ 'documents.statut': ['statut invalide'] });
  });

  it('numberFormat matches PHP number_format defaults', () => {
    expect(numberFormat(1234.5)).toBe('1,234.50');
    expect(numberFormat(0)).toBe('0.00');
  });

  it('formatDateFr renders d/m/Y', () => {
    expect(formatDateFr(new Date(Date.UTC(2026, 6, 3)))).toBe('03/07/2026');
  });
});
