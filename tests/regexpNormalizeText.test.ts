import {
  regexpNormalizeText, 
} from '../src/regexpNormalizeText';

describe('regexpNormalizeText', () => {
  test('escapes special regexp chars in string', () => {
    expect(regexpNormalizeText('a.b')).toBe('a\\.b');
    expect(regexpNormalizeText('a+b')).toBe('a\\+b');
    expect(regexpNormalizeText('a$b')).toBe('a\\$b');
  });

  test('does not escape non-special chars like slash', () => {
    expect(regexpNormalizeText('a/b')).toBe('a/b');
  });

  test('plain string without special chars is returned as-is', () => {
    expect(regexpNormalizeText('abc')).toBe('abc');
  });

  test('extracts source from RegExp', () => {
    expect(regexpNormalizeText(/hello/gi)).toBe('hello');
    expect(regexpNormalizeText(/a\.b/)).toBe('a\\.b');
  });
});
