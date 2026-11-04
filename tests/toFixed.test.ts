import {
  toFixed,
} from '../src/toFixed';

describe('toFixed', () => {
  test('rounds to 2 decimal places', () => {
    expect(toFixed(12.345)).toBe('12.35');
    expect(toFixed(0.005)).toBe('.01');
  });

  test('strips a leading zero before the dot', () => {
    expect(toFixed(0.5)).toBe('.5');
    expect(toFixed(0.29)).toBe('.29');
  });

  test('strips trailing zeros and a dangling dot', () => {
    expect(toFixed(50)).toBe('50');
    expect(toFixed(50.0)).toBe('50');
    expect(toFixed(1.5)).toBe('1.5');
  });

  test('zero input returns "0", not an empty string', () => {
    expect(toFixed(0)).toBe('0');
  });

  test('accepts numeric strings', () => {
    expect(toFixed('12.3')).toBe('12.3');
  });

  test('throws on values that are not a finite number', () => {
    expect(() => toFixed(NaN)).toThrow();
    expect(() => toFixed('abc')).toThrow();
  });

  // Регрессия на баг, найденный 2026-09-23 (minotation RESEARCH/05): IEEE754
  // может дать v*100 чуть МЕНЬШЕ целого (33.3*100 === 3329.9999999999995).
  // Math.floor в таком случае отбрасывал вниз на одну сотую — Math.round устойчив.
  test('is not thrown off by IEEE754 float representation error', () => {
    expect(toFixed(33.3)).toBe('33.3');
    expect(toFixed(0.58)).toBe('.58');
    expect(toFixed(100 * 2 / 3)).toBe('66.67');
  });

  // The fast path must give exactly what the long way gives: every short text is checked against it.
  test.each([
    '0',
    '10',
    '007',
    '1.5',
    '1.25',
    '1.05',
    '1.50',
    '1.125',
    '.5',
    '0.5',
    '00.5',
    '0.05',
    '1.',
    '.',
    '1..2',
    '',
    ' 10',
    '-10',
    '1e3',
    '1234567890123456',
  ])('text %j: the fast path agrees with the long way', (text) => {
    const long = (Math.round(+text * 100) * 0.01).toFixed(2).replace(/^0+|\.?0+$/g, '') || '0';
    if (isNaN(+text * 100)) {
      expect(() => toFixed(text)).toThrow();
    } else {
      expect(toFixed(text)).toBe(long);
    }
  });

  test.each([
    0,
    -0,
    7,
    -5,
    999999999999999,
    1e15,
    1e21,
    Infinity,
  ])('whole number %d: the fast path agrees with the long way', (value) => {
    expect(toFixed(value)).toBe((Math.round(value * 100) * 0.01).toFixed(2).replace(/^0+|\.?0+$/g, '') || '0');
  });
});
