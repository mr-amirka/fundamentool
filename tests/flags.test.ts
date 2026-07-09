import {
  flags, 
} from '../src/flags';
import {
  flagsByString, 
} from '../src/flagsByString';
import {
  deflags, 
} from '../src/deflags';
import {
  deflagsByString, 
} from '../src/deflagsByString';

describe('flags', () => {
  test('builds flat flags object', () => {
    expect(flags([
      'a',
      'b',
      'c',
    ])).toEqual({
      a: 1,
      b: 1,
      c: 1, 
    });
  });

  test('supports dot-notation for nested flags', () => {
    expect(flags(['test.use'])).toEqual({
      test: {
        use: 1, 
      }, 
    });
  });

  test('merges into provided dst', () => {
    const dst = {
      x: 1, 
    };
    flags(['y'], dst);
    expect(dst).toEqual({
      x: 1,
      y: 1, 
    });
  });

  test('empty array returns empty object', () => {
    expect(flags([])).toEqual({});
  });
});

describe('flagsByString', () => {
  test('parses space-separated string into flags object', () => {
    expect(flagsByString('a b c')).toEqual({
      a: 1,
      b: 1,
      c: 1, 
    });
  });

  test('handles null/undefined input', () => {
    expect(flagsByString(null)).toEqual({});
    expect(flagsByString(undefined)).toEqual({});
  });

  test('merges into provided dst', () => {
    const dst: Record<string, any> = {
      existing: 1, 
    };
    flagsByString('new', dst);
    expect(dst).toEqual({
      existing: 1,
      new: 1, 
    });
  });
});

describe('deflags', () => {
  test('returns keys with truthy values', () => {
    const result = deflags({
      a: 1,
      b: 0,
      c: true,
      d: false, 
    });
    expect(result.sort()).toEqual(['a', 'c']);
  });

  test('returns empty array for all-falsy', () => {
    expect(deflags({
      a: 0,
      b: false, 
    })).toEqual([]);
  });

  test('returns all keys when all truthy', () => {
    const result = deflags({
      x: 1,
      y: 2, 
    });
    expect(result.sort()).toEqual(['x', 'y']);
  });
});

describe('deflagsByString', () => {
  test('builds space-separated string from truthy flag keys', () => {
    const result = deflagsByString({
      a: true,
      b: false,
      c: true, 
    });
    expect(result).toBe('a c');
  });

  test('appends suffix when provided', () => {
    const result = deflagsByString({
      a: true, 
    }, 'extra');
    expect(result).toBe('a extra');
  });

  test('returns only suffix when all flags falsy', () => {
    expect(deflagsByString({
      a: false, 
    }, 'only')).toBe(' only');
  });
});
