import {
  urlExtend,
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

    // path для дочернего location не пересчитывается, но query должен обновиться
    expect(child.path).toBe('');
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
    expect(url.email).toBe('ann@example.com:8080');
    expect(urlExtend('http://example.com', '/x').href).toBe('/x'); // a string is a whole address: its own (empty) host
    expect(urlExtend('//host/a', {}).href).toContain('host');
    expect(urlExtend('/a', null).href).toBe('/a');
  });
});
