import {
  intval,
  floatval,
} from '../src/numval';

describe('intval', () => {
  test('parses integer from string', () => {
    expect(intval('42px')).toBe(42);
    expect(intval('10')).toBe(10);
  });

  test('returns default when parsing fails', () => {
    expect(intval('abc', 7)).toBe(7);
    expect(intval('abc')).toBe(0);
  });

  test('converts boolean to 0 or 1', () => {
    expect(intval(true)).toBe(1);
    expect(intval(false)).toBe(0);
  });

  test('clamps to [minVal, maxVal]', () => {
    expect(intval(
      3, 0, 1, 10,
    )).toBe(3);
    expect(intval(
      -5, 0, 1, 10,
    )).toBe(1);
    expect(intval(
      50, 0, 1, 10,
    )).toBe(10);
  });
});

describe('floatval', () => {
  test('parses float from string', () => {
    expect(floatval('3.14')).toBe(3.14);
    expect(floatval('2.5em')).toBe(2.5);
  });

  test('returns default when parsing fails', () => {
    expect(floatval('abc', 1.5)).toBe(1.5);
    expect(floatval('abc')).toBe(0);
  });

  test('converts boolean to 0 or 1', () => {
    expect(floatval(true)).toBe(1);
    expect(floatval(false)).toBe(0);
  });
});

describe('numval — the bounds must be numbers', () => {
  it('a bound that isn\'t a number throws, naming it', () => {
    expect(() => intval(
      '5', 0, '1' as never,
    )).toThrow(new TypeError('min value should be number: 1'));
    expect(() => floatval(
      '5', 0, undefined, 'x' as never,
    )).toThrow(new TypeError('max value should be number: x'));
  });
});
