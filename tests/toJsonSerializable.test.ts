import { toSerializableJson } from '../src/toSerializableJson';

describe('toSerializableJson', () => {
  test('primitives stay as is', () => {
    expect(toSerializableJson(1)).toBe(1);
    expect(toSerializableJson('a')).toBe('a');
    expect(toSerializableJson(false)).toBe(false);
    expect(toSerializableJson(null)).toBe(null);
  });

  test('functions and undefined become null', () => {
    expect(toSerializableJson(undefined)).toBeNull();
    expect(
      toSerializableJson({
        fn: () => 1,
      }).fn,
    ).toBeNull();
  });

  test('cycles are replaced with null', () => {
    const obj: any = {};
    obj.self = obj;

    const safe = toSerializableJson(obj);
    expect(safe.self).toBeNull();
  });

  test('arrays and objects are cloned recursively', () => {
    const src = {
      a: 1,
      b: [2, { c: 3 }],
    };
    const safe = toSerializableJson(src);

    expect(safe).toEqual({
      a: 1,
      b: [2, { c: 3 }],
    });
    expect(safe).not.toBe(src);
    expect(safe.b).not.toBe(src.b);
  });
});

