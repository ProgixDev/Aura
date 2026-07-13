import { decimalTransformer, jsonTransformer } from './transformers';

describe('decimalTransformer', () => {
  it('from(null) returns null', () => {
    expect(decimalTransformer.from(null)).toBeNull();
  });

  it('from("12.50") returns the number 12.5', () => {
    expect(decimalTransformer.from('12.50')).toBe(12.5);
  });

  it('to(10) passes through unchanged', () => {
    expect(decimalTransformer.to(10)).toBe(10);
  });
});

describe('jsonTransformer', () => {
  it('to(null) returns null', () => {
    expect(jsonTransformer.to(null)).toBeNull();
  });

  it('to({a:1}) stringifies', () => {
    expect(jsonTransformer.to({ a: 1 })).toBe('{"a":1}');
  });

  it('from(null) returns null', () => {
    expect(jsonTransformer.from(null)).toBeNull();
  });

  it('from(\'{"a":1}\') parses', () => {
    expect(jsonTransformer.from('{"a":1}')).toEqual({ a: 1 });
  });

  it('from({a:1}) passes through already-parsed objects (mysql2 case)', () => {
    expect(jsonTransformer.from({ a: 1 })).toEqual({ a: 1 });
  });
});
