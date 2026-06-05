import { forIn } from '../src/forIn';

describe('forIn', () => {
  test('iterates over all enumerable properties', () => {
    const result: [string, number][] = [];
    forIn({ a: 1, b: 2, c: 3 }, (v, k) => result.push([k, v]));
    expect(result).toContainEqual(['a', 1]);
    expect(result).toContainEqual(['b', 2]);
    expect(result).toContainEqual(['c', 3]);
  });

  test('passes the object as the third argument', () => {
    const obj = { x: 1 };
    let captured: any;
    forIn(obj, (v, k, o) => { captured = o; });
    expect(captured).toBe(obj);
  });

  test('does not iterate over empty object', () => {
    const fn = jest.fn();
    forIn({}, fn);
    expect(fn).not.toHaveBeenCalled();
  });
});
