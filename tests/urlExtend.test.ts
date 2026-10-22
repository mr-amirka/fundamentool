import {
  urlExtend,
  urlParse,
} from '../src/urlExtend';

describe('urlExtend', () => {
  test('combines base and child url', () => {
    const base = 'https://example.com/path';
    const src = {
      query: {
        a: 1,
      },
    };

    const result = urlExtend(base, src);

    expect(result.href).toBe('https://example.com/path?a=1');
    expect(result.query).toEqual({
      a: 1,
    });
  });

  test('merges child paths', () => {
    const first = {
      path: '/parent',
      child: {
        path: '/child',
      },
    } as any;

    const src = {
      child: {
        query: {
          x: 1,
        },
      },
    } as any;

    const result = urlExtend(first, src);
    const child = result.child as any;

    // The child keeps its path (a `path` in an object was ignored — it came out ''), its query updated
    expect(child.path).toBe('/child');
    expect(result.path).toBe('/parent');
    expect(result.href).toBe('/parent#/child?x=1');
    expect(child.query).toEqual({
      x: 1,
    });
  });
});


describe('urlExtend — every part of an address', () => {
  it('user, password, port; a file with an extension; a hash child', () => {
    const url = urlExtend('https://ann:pw@example.com:8080/docs/guide.html?a=1#/top', {
      query: {
        b: 2,
      },
    });
    expect(url.href).toBe('https://ann:pw@example.com:8080/docs/guide.html?a=1&b=2#/top');
    expect(url.email).toBe('ann@example.com'); // an address has no port
    expect(urlExtend('http://example.com', '/x').href).toBe('http://example.com/x'); // read as <a href> (D-056)
    expect(urlExtend('//host/a', {}).href).toContain('host');
    expect(urlExtend('/a', null).href).toBe('/a');
  });
});

describe('urlExtend — objects with a path, the user part', () => {
  it('`path` in an object is the path (it was ignored: `{ path }` alone gave \'\'); it wins over stale parts', () => {
    expect(urlExtend({}, {
      path: '/b',
    }).href).toBe('/b');
    expect(urlExtend('/a?x=1', {
      child: {
        path: '/b',
      },
    } as never).href).toBe('/a?x=1#/b');
    const location = urlParse('/catalog/item.html?x=1');
    expect(urlExtend(location, {
      path: '/new',
    }).href).toBe('/new?x=1');
    expect(urlExtend({
      ...location,
      path: '/new/x.js',
    }, {
      query: {
        y: 2,
      },
    }).href).toBe('/new/x.js?x=1&y=2');
  });

  it('a user without a password has no \':\'; the email has no port', () => {
    const url = urlExtend('https://ann@h.io:81/a', {});
    expect([
      url.href,
      url.email,
      url.login,
    ]).toEqual([
      'https://ann@h.io:81/a',
      'ann@h.io',
      'ann@h.io:81',
    ]);
    expect(urlExtend('https://ann:pw@h.io/a', {}).href).toBe('https://ann:pw@h.io/a');
    expect(urlExtend({
      alias: 'app',
      extension: 'js',
    }, {}).href).toBe('/app.js'); // a file without a directory: at the root
    expect(urlExtend({}, {}).href).toBe(''); // nothing: an empty address
  });
});

describe('urlExtend — a string read as <a href> reads it (D-056)', () => {
  it.each([
    [
      '/a?y=2',
      '?x=1',
      '/a?x=1',
    ], // the query replaced, the path kept (it used to be '?x=1&y=2')
    [
      '/a?y=2',
      '#/b',
      '/a?y=2#/b',
    ],
    [
      '/a/b?y=2',
      'c',
      '/a/c',
    ],
    [
      '/a/b?y=2',
      '../c',
      '/c',
    ],
    [
      '/a/b',
      '/c?z=1',
      '/c?z=1',
    ],
    [
      '/a?y=2#/h',
      '',
      '/a?y=2',
    ], // nothing: the base without its hash
    [
      'https://ann:pw@h.io:81/docs/guide?x=1#/t',
      '?q=2',
      'https://ann:pw@h.io:81/docs/guide?q=2',
    ],
    [
      'https://h.io/docs/guide',
      '../api',
      'https://h.io/api',
    ],
    [
      'https://h.io/docs/guide',
      '/root',
      'https://h.io/root',
    ],
    [
      'https://h.io/a',
      '//cdn.io/x.js',
      'https://cdn.io/x.js',
    ], // the base's scheme
    [
      'https://h.io/a',
      'mailto:x@y.z',
      'mailto:x@y.z',
    ], // a whole address — itself
    [
      'https://h.io',
      'c',
      'https://h.io/c',
    ],
    [
      'file:///etc/hosts',
      'passwd',
      'file:///etc/passwd',
    ],
    [
      '',
      '?x=1',
      '?x=1',
    ],
    [
      '',
      'c',
      'c',
    ],
    [
      'a/b',
      '../c',
      'c',
    ], // a base without a root stays without one
    [
      '/a',
      '//cdn.io/x',
      '//cdn.io/x',
    ], // no scheme to lend
    [
      '/a',
      'https://x.io/p',
      'https://x.io/p',
    ],
  ])('%p + %p → %p', (
    base, ref, href,
  ) => {
    expect(urlExtend(base, ref).href).toBe(href);
  });

  it('an object base is read through its fields; a base that isn\'t an address can\'t lend one', () => {
    expect(urlExtend({
      path: '/a/b',
      query: {
        y: 2,
      },
    }, 'c?x=1').href).toBe('/a/c?x=1');
    expect(() => urlExtend('https://', 'c')).toThrow('urlExtend: can\'t read "c" against "https://" — the base isn\'t an address');
  });
});
