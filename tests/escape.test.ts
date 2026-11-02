import {
  escapeHTML,
} from '../src/escapeHTML';
import {
  escapeCss,
} from '../src/escapeCss';
import {
  escapeQuote,
} from '../src/escapeQuote';

describe('escapeHTML', () => {
  test('escapes ampersand', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b');
  });

  test('escapes angle brackets', () => {
    expect(escapeHTML('<div>')).toBe('&lt;div&gt;');
  });

  test('escapes single quotes with &#039;', () => {
    expect(escapeHTML("it's")).toBe('it&#039;s');
  });

  test('does not modify plain text', () => {
    expect(escapeHTML('hello world')).toBe('hello world');
  });

  test('handles empty string', () => {
    expect(escapeHTML('')).toBe('');
  });

  test('combines multiple replacements', () => {
    expect(escapeHTML("<script>alert('xss')</script>")).toBe('&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;');
  });
});

describe('escapeCss', () => {
  test('escapes dots', () => {
    const result = escapeCss('hello.world');
    expect(result).toContain('\\.');
  });

  test('does not modify plain alphanumeric strings', () => {
    expect(escapeCss('hello123')).toBe('hello123');
  });

  test.each([
    [
      'w{1+2}',
      'w\\{1\\+2\\}',
    ],
    [
      'bg&x?',
      'bg\\&x\\?',
    ],
    [
      '2xl:p-4',
      '\\32 xl\\:p-4',
    ],
    [
      '-2a',
      '-\\32 a',
    ],
    [
      '-',
      '\\-',
    ],
    [
      '--a',
      '--a',
    ],
    [
      '-_a',
      '-_a',
    ],
    [
      '_a',
      '_a',
    ],
    [
      'a\u0000b',
      'a\uFFFDb',
    ],
    [
      'a\u0001b\u007f',
      'a\\1 b\\7f ',
    ],
    [
      'цвет·é',
      'цвет·é',
    ],
    [
      'a b\\c',
      'a\\ b\\\\c',
    ],
    [
      '',
      '',
    ],
  ])('as CSS.escape (CSSOM): %j → %j', (value, escaped) => {
    expect(escapeCss(value)).toBe(escaped);
  });
});

describe('escapeQuote', () => {
  test('escapes double quotes with backslash', () => {
    expect(escapeQuote('"quoted"')).toBe('\\"quoted\\"');
  });

  test('escapes backslashes', () => {
    expect(escapeQuote('path\\to')).toBe('path\\\\to');
  });

  test('does not modify strings without quotes or backslashes', () => {
    expect(escapeQuote('hello')).toBe('hello');
  });
});
