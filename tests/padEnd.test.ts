import {
  padEnd, 
} from '../src/padEnd';

describe('padEnd', () => {
  test('pads to length', () => {
    expect(padEnd('ab', 5)).toBe('ab   ');
  });

  test('returns same string when already long enough', () => {
    expect(padEnd('hello', 3)).toBe('hello');
  });

  test('custom pad string', () => {
    expect(padEnd(
      'x', 4, '0',
    )).toBe('x000');
  });
});
