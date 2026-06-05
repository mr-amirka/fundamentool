import { trim } from '../src/trim';

describe('trim', () => {
  test('trims spaces from both ends', () => {
    expect(trim('  hello  ')).toBe('hello');
  });

  test('returns same string when no whitespace', () => {
    expect(trim('hello')).toBe('hello');
  });

  test('trims tabs and newlines', () => {
    expect(trim('\t text \n')).toBe('text');
  });
});
