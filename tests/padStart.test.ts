import { padStart } from '../src/padStart';

describe('padStart', () => {
  test('pads to length', () => {
    expect(padStart('ab', 5)).toBe('   ab');
  });

  test('returns same string when already long enough', () => {
    expect(padStart('hello', 3)).toBe('hello');
  });

  test('custom pad string', () => {
    expect(padStart('x', 4, '0')).toBe('000x');
  });
});
