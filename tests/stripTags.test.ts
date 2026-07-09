import {
  stripTags, 
} from '../src/stripTags';
import {
  toHTML, 
} from '../src/toHTML';

describe('stripTags', () => {
  test('removes a single HTML tag', () => {
    expect(stripTags('<p>Hello</p>')).toBe('Hello');
  });

  test('removes nested tags and strips all whitespace between words', () => {
    // Note: implementation replaces tags with a space then removes ALL whitespace,
    // so words end up adjacent (no space between them).
    expect(stripTags('<p>Hello<b>World</b></p>')).toBe('HelloWorld');
  });

  test('removes self-closing tags', () => {
    expect(stripTags('line1<br/>line2')).toBe('line1line2');
  });

  test('strips whitespace from plain text too', () => {
    // all whitespace (\s+) is removed after the tag pass
    expect(stripTags('plain text')).toBe('plaintext');
  });

  test('handles string with only tags', () => {
    const result = stripTags('<div></div>');
    expect(result).toBe('');
  });
});

describe('toHTML', () => {
  test('escapes HTML special characters', () => {
    expect(toHTML('a < b')).toBe('a &lt; b');
  });

  test('replaces newline with <br/>', () => {
    expect(toHTML('line1\nline2')).toBe('line1<br/>line2');
  });

  test('replaces CRLF with <br/>', () => {
    expect(toHTML('line1\r\nline2')).toBe('line1<br/>line2');
  });

  test('handles both escaping and line breaks', () => {
    expect(toHTML('<hello>\nworld')).toBe('&lt;hello&gt;<br/>world');
  });

  test('does not add <br/> when no newlines', () => {
    expect(toHTML('hello world')).toBe('hello world');
  });
});
