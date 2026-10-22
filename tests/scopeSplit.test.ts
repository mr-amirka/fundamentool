import {
  scopeSplit,
} from '../src/scopeSplit';

describe('scopeSplit', () => {
  test('returns whole string when no scopes', () => {
    expect(scopeSplit(
      'abc', '(', ')',
    )).toEqual(['abc']);
    expect(scopeSplit(
      '', '(', ')',
    )).toEqual([]);
  });

  test('simple single-level scope a(b)c', () => {
    const result = scopeSplit(
      'a(b)c', '(', ')',
    );
    expect(result).toEqual([
      'a',
      ['b'],
      'c',
    ]);
  });

  test('nested scopes a(b(c)d)e', () => {
    const result = scopeSplit(
      'a(b(c)d)e', '(', ')',
    );
    expect(result).toEqual([
      'a',
      [
        'b',
        ['c'],
        'd',
      ],
      'e',
    ]);
  });

  test('multiple sibling scopes a(b)(c)', () => {
    const result = scopeSplit(
      'a(b)(c)', '(', ')',
    );
    expect(result).toEqual([
      'a',
      ['b'],
      ['c'],
    ]);
  });

  test('multi-char delimiters {{ }}', () => {
    const result = scopeSplit(
      'pre{{inner}}post', '{{', '}}',
    );
    expect(result).toEqual([
      'pre',
      ['inner'],
      'post',
    ]);
  });

  test('throws on unclosed scope', () => {
    expect(() => scopeSplit(
      'a(b', '(', ')',
    )).toThrow(/Scope syntax error/);
  });

  test('throws or fails on extra closing scope', () => {
    expect(() => scopeSplit(
      'a)b', '(', ')',
    )).toThrow();
  });
});

describe('scopeSplit — a closer with nothing open', () => {
  it('is a syntax error, before anything is read past it', () => {
    expect(() => scopeSplit(')x(')).toThrow('Scope syntax error: ")x(", depth: -1');
    expect(() => scopeSplit('a)')).toThrow('Scope syntax error: "a)", depth: -1');
  });

  it('the default brackets are ( )', () => {
    expect(scopeSplit('a(b)c')).toEqual([
      'a',
      ['b'],
      'c',
    ]);
  });
});
