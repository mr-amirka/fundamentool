import { startsWith } from '../src/startsWith';

describe('startsWith', () => {
  test('returns true when string starts with search', () => {
    expect(startsWith('hello', 'he')).toBe(true);
    expect(startsWith('hello', 'hello')).toBe(true);
  });

  test('returns false when not starting with search', () => {
    expect(startsWith('hello', 'el')).toBe(false);
  });

  test('position parameter', () => {
    expect(startsWith('hello', 'el', 1)).toBe(true);
  });
});
