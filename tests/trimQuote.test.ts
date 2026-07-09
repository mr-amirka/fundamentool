import {
  trimQuote, 
} from '../src/trimQuote';

describe('trimQuote', () => {
  test('removes double quotes', () => {
    expect(trimQuote('"hello"')).toBe('hello');
  });

  test('removes single quotes', () => {
    expect(trimQuote("'hello'")).toBe('hello');
  });

  test('removes backticks', () => {
    expect(trimQuote('`hello`')).toBe('hello');
  });

  test('does not modify unquoted strings', () => {
    expect(trimQuote('hello')).toBe('hello');
  });

  test('removes only leading/trailing quotes', () => {
    expect(trimQuote('"hello world"')).toBe('hello world');
  });

  test('handles empty string', () => {
    expect(trimQuote('')).toBe('');
  });

  test('removes multiple leading/trailing quote chars', () => {
    expect(trimQuote('""hello""')).toBe('hello');
  });
});
