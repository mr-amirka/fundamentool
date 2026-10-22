import {
  complement,
} from '../src/complement';

describe('complement', () => {
  test('fills missing keys from src into dst', () => {
    const dst = {
      a: 1,
    };
    const src = {
      a: 0,
      b: 2,
    };
    const result = complement(
      dst, src, 0,
    );
    expect(result).toBe(dst);
    expect(dst).toEqual({
      a: 1,
      b: 2,
    });
  });

  test('depth 0 does not merge nested', () => {
    const dst = {};
    complement(
      dst, {
        x: {
          a: 1,
        },
      }, 0,
    );
    expect(dst).toEqual({
      x: {
        a: 1,
      },
    });
  });

  test('when dst undefined returns copy of src', () => {
    const src = {
      a: 1,
    };
    const result = complement(
      undefined, src, 0,
    );
    expect(result).toEqual({
      a: 1,
    });
    expect(result).not.toBe(src);
  });
});

describe('complement — every branch', () => {
  it('below zero depth or a source that isn\'t a plain object: the target, or the source when there is none', () => {
    expect(complement(
      {
        a: 1,
      }, {
        b: 2,
      }, -1,
    )).toEqual({
      a: 1,
    });
    expect(complement(
      undefined as never, 5 as never, 0,
    )).toBe(5);
    expect(complement(
      'kept' as never, {
        b: 2,
      }, 0,
    )).toBe('kept');
    expect(complement(
      undefined as never, {
        b: 2,
      }, 0,
    )).toEqual({
      b: 2,
    });
  });

  it('fills what is missing — deeply as far as `depth`; undefined in the source is no value', () => {
    const dst: Record<string, any> = {
      kept: {
        x: 1,
      },
    };
    complement(
      dst, {
        kept: {
          x: 9,
          y: 2,
        },
        fresh: {
          z: 3,
        },
        none: undefined,
      }, 2,
    );
    expect(dst).toEqual({
      kept: {
        x: 1,
        y: 2,
      },
      fresh: {
        z: 3,
      },
    });
  });
});
