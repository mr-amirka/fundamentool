import { urlTranslite } from '../src/urlTranslite';

describe('urlTranslite', () => {
  test('lowercases latin characters', () => {
    expect(urlTranslite('Hello World')).toBe('hello-world');
  });

  test('transliterates Cyrillic to Latin', () => {
    expect(urlTranslite('Привет')).toBe('privet');
  });

  test('converts spaces and special chars to dashes', () => {
    expect(urlTranslite('Hello World!')).toBe('hello-world');
  });

  test('collapses consecutive dashes', () => {
    expect(urlTranslite('hello  world')).toBe('hello-world');
  });

  test('trims leading and trailing dashes', () => {
    expect(urlTranslite('!hello!')).toBe('hello');
  });

  test('handles mixed Cyrillic and Latin', () => {
    const result = urlTranslite('Мир Peace');
    expect(result).toBe('mir-peace');
  });

  test('produces empty string for all-special input', () => {
    expect(urlTranslite('!@#')).toBe('');
  });
});
