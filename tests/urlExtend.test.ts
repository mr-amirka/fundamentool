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
    expect(urlExtend('http://example.com', '/x').href).toBe('/x'); // a string is a whole address: its own (empty) host
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
