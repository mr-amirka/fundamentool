import {
  eachAsync,
  forEachAsync,
  forInAsync,
  mapAsync,
  mapInAsync,
  filterAsync,
  filterInAsync,
  findAsync,
  findInAsync,
  reduceAsync,
  reduceInAsync,
} from '../../src/async';

describe('async collection helpers', () => {
  test('forEachAsync iterates sequentially over array', async () => {
    const items = [1, 2, 3];
    const visited: number[] = [];

    const result = await forEachAsync(items, async (value, index) => {
      visited.push(value * 2 + index);
    });

    expect(result).toBe(items);
    expect(visited).toEqual([2, 5, 8]);
  });

  test('forInAsync iterates over object properties', async () => {
    const obj = { a: 1, b: 2 };
    const pairs: Array<[string, number]> = [];

    const result = await forInAsync(obj, async function (value, key, collection) {
      pairs.push([key, value + collection[key]]);
    });

    expect(result).toBe(obj);
    expect(pairs).toEqual([
      ['a', 2],
      ['b', 4],
    ]);
  });

  test('eachAsync chooses correct iterator for arrays and objects', async () => {
    const arr = [1, 2];
    const obj = { a: 1, b: 2 };

    const arrVisited: number[] = [];
    const objVisited: string[] = [];

    const arrResult = await eachAsync(arr, (value: number) => {
      arrVisited.push(value);
    });

    const objResult = await eachAsync(obj, (value, key) => {
      objVisited.push(`${key}:${value}`);
    });

    expect(arrResult).toBe(arr);
    expect(objResult).toBe(obj);
    expect(arrVisited).toEqual([1, 2]);
    expect(objVisited.sort()).toEqual(['a:1', 'b:2']);
  });

  test('mapAsync maps array with async iteratee', async () => {
    const result = await mapAsync([1, 2, 3], async (v, i) => v * 10 + i);
    expect(result).toEqual([10, 21, 32]);
  });

  test('mapInAsync maps object to new object', async () => {
    const obj = { a: 1, b: 2 };
    const result = await mapInAsync(obj, async (v, key) => v * 2 + (key === 'a' ? 1 : 0));

    expect(result).toEqual({ a: 3, b: 4 });
  });

  test('filterAsync filters array using async predicate', async () => {
    const items = [1, 2, 3, 4];
    const result = await filterAsync(items, async (v) => v % 2 === 0, null);
    expect(result).toEqual([2, 4]);
  });

  test('filterInAsync filters object and returns object', async () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = await filterInAsync(obj, async (v) => v > 1);

    expect(result).toEqual({ b: 2, c: 3 });
  });

  test('findAsync returns first matching element or undefined', async () => {
    const items = [1, 3, 4, 6];
    const found = await findAsync(items, async (v) => v % 2 === 0);
    const notFound = await findAsync(items, async (v) => v > 10);

    expect(found).toBe(4);
    expect(notFound).toBeUndefined();
  });

  test('findInAsync returns first matching value from object', async () => {
    const obj = { a: 1, b: 3, c: 4 };
    const found = await findInAsync(obj, async (v) => v % 2 === 0);
    const notFound = await findInAsync(obj, async (v) => v > 10);

    expect(found).toBe(4);
    expect(notFound).toBeUndefined();
  });

  test('reduceAsync reduces array from left to right with async iteratee', async () => {
    const sum = await reduceAsync(
      [1, 2, 3],
      async (acc, v) => {
        return acc + v * 2;
      },
      0,
    );

    expect(sum).toBe(12);
  });

  test('reduceInAsync reduces object values', async () => {
    const obj = { a: 1, b: 2, c: 3 };
    const sum = await reduceInAsync(
      obj,
      async (acc, v) => {
        return acc + v;
      },
      0,
    );

    expect(sum).toBe(6);
  });
});

