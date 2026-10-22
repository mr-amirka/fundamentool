/**
 * `extendDepth` and `mergeDepth` — `src` written over `dst`, objects merged as deep as `depth`.
 */
import {
  extendDepth,
} from '../src/extendDepth';
import {
  mergeDepth,
} from '../src/mergeDepth';

describe('extendDepth', () => {
  it('no source — the target; below zero or not a plain object — the source; a target that isn\'t an object — a new one', () => {
    const dst = {
      a: 1,
    };
    expect(extendDepth(
      dst, undefined as never, 1,
    )).toBe(dst);
    expect(extendDepth(
      dst, {
        b: 2,
      } as never, -1,
    )).toEqual({
      b: 2,
    });
    expect(extendDepth(
      dst, 7 as never, 1,
    )).toBe(7);
    expect(extendDepth(
      null as never, {
        c: 3,
      }, 0,
    )).toEqual({
      c: 3,
    });
  });

  it('merges as deep as `depth`; deeper — replaced; undefined values skipped', () => {
    const dst: Record<string, any> = {
      keep: {
        x: 1,
        deep: {
          y: 1,
        },
      },
      plain: 5,
    };
    extendDepth(
      dst, {
        keep: {
          z: 2,
          deep: {
            w: 2,
          },
        },
        fresh: {
          q: 1,
        },
        plain: undefined,
      }, 1,
    );
    expect(dst).toEqual({
      keep: {
        x: 1,
        z: 2,
        deep: {
          w: 2,
        },
      },
      fresh: {
        q: 1,
      },
      plain: 5,
    });
  });
});

describe('mergeDepth', () => {
  it('every source over the target in turn', () => {
    expect(mergeDepth(
      [
        {
          a: {
            x: 1,
          },
        },
        {
          a: {
            y: 2,
          },
        },
      ], {}, 1,
    )).toEqual({
      a: {
        x: 1,
        y: 2,
      },
    });
  });
});

describe('extendDepth — the default depth', () => {
  it('0: a key is replaced, not merged into', () => {
    const dst = {
      a: {
        x: 1,
      },
    } as Record<string, any>;
    expect(extendDepth(dst, {
      a: {
        y: 2,
      },
    })).toEqual({
      a: {
        y: 2,
      },
    });
  });
});
