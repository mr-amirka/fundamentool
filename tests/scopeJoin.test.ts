import { scopeJoin } from '../src/scopeJoin';

describe('scopeJoin', () => {
  test('joins flat scope array to string', () => {
    expect(scopeJoin(['a', 'b', 'c'])).toBe('abc');
    expect(scopeJoin([])).toBe('');
  });

  test('joins single-level scope', () => {
    // a(b)c
    const tree: (string | any[])[] = ['a', ['b'], 'c'];
    expect(scopeJoin(tree)).toBe('a(b)c');
  });

  test('joins nested scopes', () => {
    // a(b(c)d)e
    const tree: (string | any[])[] = ['a', ['b', ['c'], 'd'], 'e'];
    expect(scopeJoin(tree)).toBe('a(b(c)d)e');
  });

  test('joins multiple sibling scopes', () => {
    // a(b)(c)
    const tree: (string | any[])[] = ['a', ['b'], ['c']];
    expect(scopeJoin(tree)).toBe('a(b)(c)');
  });

  test('supports custom multi-char delimiters', () => {
    const tree: (string | any[])[] = ['pre', ['inner'], 'post'];
    expect(scopeJoin(tree, '{{', '}}')).toBe('pre{{inner}}post');
  });
});

