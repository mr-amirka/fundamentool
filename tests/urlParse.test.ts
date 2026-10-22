import {
  urlParse,
} from '../src/urlParse';

describe('urlParse', () => {
  test('parses simple http URL', () => {
    const u = urlParse('http://example.com/path');
    expect(u.protocol).toBe('http');
    expect(u.hostname).toBe('example.com');
    expect(u.path).toBe('/path');
    expect(u.href).toBe('http://example.com/path');
  });

  test('parses query string (numbers parsed as numbers)', () => {
    const u = urlParse('https://a.b/c?x=1&y=2');
    expect(u.query).toEqual({
      x: 1,
      y: 2,
    });
    expect(u.search).toBe('x=1&y=2');
  });

  test('parses hash and child URL (numbers parsed as numbers)', () => {
    const u = urlParse('https://example.com/#/path?q=3');
    expect(u.hash).toBe('/path?q=3');
    expect(u.child).not.toBeNull();
    if (u.child) {
      expect(u.child.query).toEqual({
        q: 3,
      });
    }
  });

  test('parses host and port', () => {
    const u = urlParse('https://localhost:8080/api');
    expect(u.hostname).toBe('localhost');
    expect(u.port).toBe('8080');
    expect(u.host).toBe('localhost:8080');
  });

  test('handles empty or non-URL string', () => {
    const u = urlParse('');
    expect(u.protocol).toBe('');
    expect(u.hostname).toBe('');
  });
});

describe('urlParse — a bare query, nothing', () => {
  it('`a=1&b=2` (no `?`, no `/`) is a query; nothing is an empty address', () => {
    const bare = urlParse('a=1&b=2');
    expect([
      bare.path,
      bare.query,
    ]).toEqual([
      '',
      {
        a: 1,
        b: 2,
      },
    ]);
    const none = urlParse(undefined as never);
    expect([
      none.path,
      none.query,
      none.href,
    ]).toEqual([
      '',
      {},
      '',
    ]);
  });
});

describe('urlParse — the parts of a full address', () => {
  it.each([
    [
      'https://ann:pw@host.io:8080/a/b?x=1#/c',
      {
        username: 'ann',
        password: 'pw',
        host: 'host.io:8080',
        hostname: 'host.io',
        port: '8080',
        login: 'ann:pw@host.io:8080',
        email: 'ann@host.io',
        unpath: 'https://ann:pw@host.io:8080',
        path: '/a/b',
        dirname: '/a/',
      },
    ],
    [
      'https://host.io/a',
      {
        username: '',
        password: '',
        host: 'host.io',
        hostname: 'host.io',
        port: '',
        login: '',
        email: '',
        unpath: 'https://host.io',
        path: '/a',
        dirname: '/',
      },
    ],
    [
      'https://ann@host.io',
      {
        username: 'ann',
        password: '',
        host: 'host.io',
        hostname: 'host.io',
        port: '',
        login: 'ann@host.io',
        email: 'ann@host.io',
        unpath: 'https://ann@host.io',
        path: '',
        dirname: '',
      },
    ],
    [
      'file:///etc/hosts',
      {
        username: '',
        password: '',
        host: '',
        hostname: '',
        port: '',
        login: '',
        email: '',
        unpath: '',
        path: '/etc/hosts',
        dirname: '/etc/',
      },
    ],
  ])('%s', (href, parts) => {
    expect(urlParse(href)).toMatchObject(parts);
  });
});
