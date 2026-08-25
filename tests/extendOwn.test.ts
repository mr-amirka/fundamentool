import {
  extendOwn, 
} from '../src/extendOwn';
import {
  extendDepth, 
} from '../src/extendDepth';
import {
  extendIfEmpty, 
} from '../src/extendIfEmpty';
import {
  extendByPathsMap, 
} from '../src/extendByPathsMap';

describe('extendOwn', () => {
  test('copies only own properties', () => {
    const proto = {
      inherited: 1, 
    };
    const src = Object.create(proto) as Record<string, any>;
    src.own = 2;
    const dst = extendOwn({}, src);
    expect(dst).toEqual({
      own: 2, 
    });
    expect((dst as any).inherited).toBeUndefined();
  });

  test('overwrites existing keys', () => {
    expect(extendOwn({
      a: 1, 
    }, {
      a: 99, 
    })).toEqual({
      a: 99, 
    });
  });

  test('returns dst', () => {
    const dst = {
      a: 1, 
    };
    expect(extendOwn(dst, {
      b: 2, 
    })).toBe(dst);
  });
});

describe('extendDepth', () => {
  test('deep-merges nested objects at depth 1', () => {
    const dst: any = {
      a: {
        x: 1, 
      }, 
    };
    extendDepth(
      dst, {
        a: {
          y: 2, 
        }, 
      } as any, 1,
    );
    expect(dst).toEqual({
      a: {
        x: 1,
        y: 2, 
      }, 
    });
  });

  test('overwrites non-object values at depth 0', () => {
    const dst: any = {
      a: 1, 
    };
    extendDepth(
      dst, {
        a: 2, 
      } as any, 0,
    );
    expect(dst.a).toBe(2);
  });

  test('does not mutate src', () => {
    const src = {
      a: {
        b: 1, 
      }, 
    };
    extendDepth(
      {} as any, src as any, 1,
    );
    expect(src).toEqual({
      a: {
        b: 1, 
      }, 
    });
  });

  test('returns dst', () => {
    const dst: any = {
      a: 1, 
    };
    expect(extendDepth(
      dst, {} as any, 0,
    )).toBe(dst);
  });
});

describe('extendIfEmpty', () => {
  test('does not overwrite truthy existing values', () => {
    const dst = {
      a: 1, 
    };
    extendIfEmpty(dst, {
      a: 99,
      b: 2, 
    });
    expect(dst).toEqual({
      a: 1,
      b: 2, 
    });
  });

  test('overwrites falsy (0) values', () => {
    const dst: Record<string, any> = {
      a: 0, 
    };
    extendIfEmpty(dst, {
      a: 5, 
    });
    expect(dst.a).toBe(5);
  });

  test('sets missing keys', () => {
    const dst: Record<string, any> = {};
    extendIfEmpty(dst, {
      x: 42, 
    });
    expect(dst.x).toBe(42);
  });
});

describe('extendByPathsMap', () => {
  test('copies value from nested src path to flat dst key', () => {
    const result = extendByPathsMap(
      {}, {
        user: {
          name: 'Ann', 
        }, 
      }, {
        name: 'user.name', 
      },
    );
    expect(result).toEqual({
      name: 'Ann', 
    });
  });

  test('ignores undefined src values', () => {
    const result = extendByPathsMap(
      {}, {
        a: 1, 
      }, {
        b: 'missing', 
      },
    );
    expect(result).toEqual({});
  });

  test('returns dst unchanged when map is undefined', () => {
    const dst = {
      x: 1, 
    };
    expect(extendByPathsMap(
      dst, {}, undefined,
    )).toBe(dst);
  });
});
