import { regexpParse } from '../src/regexpParse';

describe('regexpParse', () => {
  test('parses regexp string into match array', () => {
    const result = regexpParse('/abc/gi');
    expect(result).not.toBeNull();
    expect(result![1]).toBe('abc');
    expect(result![2]).toBe('gi');
  });

  test('parses regexp with empty flags', () => {
    const result = regexpParse('/hello/');
    expect(result).not.toBeNull();
    expect(result![1]).toBe('hello');
    expect(result![2]).toBe('');
  });

  test('parses complex pattern', () => {
    const result = regexpParse('/users/:id/');
    expect(result![1]).toBe('users/:id');
    expect(result![2]).toBe('');
  });

  test('returns null for non-regexp string', () => {
    expect(regexpParse('notARegexp')).toBeNull();
    expect(regexpParse('')).toBeNull();
  });
});
