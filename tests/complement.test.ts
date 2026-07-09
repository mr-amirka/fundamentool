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
