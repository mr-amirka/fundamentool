import {
  set, setBase, 
} from '../src/set';

describe('set', () => {
  test('sets value at dot path', () => {
    const obj: Record<string, any> = {};
    set(
      obj, 'a.b.c', 'value',
    );
    expect(obj.a.b.c).toBe('value');
  });

  test('accepts array path', () => {
    const obj: Record<string, any> = {};
    set(
      obj, ['x', 'y'], 42,
    );
    expect(obj.x.y).toBe(42);
  });

  test('sets numeric key on existing array', () => {
    const arr: any[] = [
      'a',
      'b',
      'c',
    ];
    set(
      arr, '1', 'B',
    );
    expect(arr[1]).toBe('B');
  });

  test('returns ctx when path is empty/falsy', () => {
    const obj = {
      a: 1, 
    };
    expect(set(
      obj, '', 2,
    )).toBe(obj);
    expect(set(
      obj, null as any, 2,
    )).toBe(obj);
  });
});

describe('setBase', () => {
  test('sets value at path array', () => {
    const obj: Record<string, any> = {};
    setBase(
      obj, ['a', 'b'], 1,
    );
    expect(obj.a.b).toBe(1);
  });
});
