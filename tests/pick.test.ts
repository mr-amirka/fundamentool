import {
  pick, 
} from '../src/pick';

describe('pick', () => {
  test('picks specified keys into output', () => {
    const input = {
      a: 1,
      b: 2,
      c: 3, 
    };
    const result = pick(input, ['a', 'c']);
    expect(result).toEqual({
      a: 1,
      c: 3, 
    });
  });

  test('returns empty object when input is null/undefined', () => {
    expect(pick(null, ['a'])).toEqual({});
    expect(pick(undefined, ['a'])).toEqual({});
  });

  test('writes into provided output', () => {
    const input = {
      a: 1, 
    };
    const output: Record<string, number> = {};
    const result = pick(
      input, ['a'], output,
    );
    expect(result).toBe(output);
    expect(output).toEqual({
      a: 1, 
    });
  });

  test('fills outOther with rest when provided', () => {
    const input = {
      a: 1,
      b: 2,
      c: 3, 
    };
    const outOther: Record<string, number> = {};
    pick(
      input, ['a'], {}, outOther,
    );
    expect(outOther).toEqual({
      b: 2,
      c: 3, 
    });
  });

  test('skips undefined values in input', () => {
    const input = {
      a: 1,
      b: undefined,
      c: 3, 
    };
    const result = pick(input, [
      'a',
      'b',
      'c',
    ]);
    expect(result).toEqual({
      a: 1,
      c: 3, 
    });
  });
});
