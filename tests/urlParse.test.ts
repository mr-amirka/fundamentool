import { urlParse } from '../src/urlParse';

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
    expect(u.query).toEqual({ x: 1, y: 2 });
    expect(u.search).toBe('x=1&y=2');
  });

  test('parses hash and child URL (numbers parsed as numbers)', () => {
    const u = urlParse('https://example.com/#/path?q=3');
    expect(u.hash).toBe('/path?q=3');
    expect(u.child).not.toBeNull();
    if (u.child) {
      expect(u.child.query).toEqual({ q: 3 });
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
