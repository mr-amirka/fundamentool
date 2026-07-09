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

