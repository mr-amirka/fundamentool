import { reduce } from '../src/reduce';
import { reduceIn } from '../src/reduceIn';

describe('reduceIn', () => {
  test('reduces over object properties', () => {
    const src = { a: 1, b: 2 };
    const keys: string[] = [];
    const sum = reduceIn(src, (acc, v, k) => {
      keys.push(k);
      return acc + v;
    }, 0);

    expect(sum).toBe(3);
    expect(keys.sort()).toEqual(['a', 'b']);
  });
});

describe('reduce (array)', () => {
  test('reduces array left-to-right', () => {
    const iterator = jest.fn((acc: number, v: number) => acc + v);
    const result = reduce([1, 2, 3], iterator, 0);

    expect(result).toBe(6);
    expect(iterator).toHaveBeenCalledTimes(3);
  });
});
