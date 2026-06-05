import { escapeRegExp } from '../src/escapeRegExp';

describe('escapeRegExp', () => {
  test('escapes special regex chars', () => {
    expect(escapeRegExp('a.b')).toBe('a\\.b');
    expect(escapeRegExp('(x)')).toBe('\\(x\\)');
  });

  test('escapes backslash and caret', () => {
    expect(escapeRegExp('\\')).toBe('\\\\');
    expect(escapeRegExp('^start')).toBe('\\^start');
  });

  test('plain string unchanged when no special chars', () => {
    expect(escapeRegExp('hello')).toBe('hello');
  });
});
