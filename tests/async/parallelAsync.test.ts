import {
  filterInParallel,
  filterParallel,
  findInParallel,
  findParallel,
  forEachParallel,
  forInParallel,
  loopParallel,
  mapInParallel,
  mapParallel,
  reduceInParallel,
  reduceParallel,
} from '../../src/async';

describe('parallel async helpers', () => {
  test('loopParallel runs tasks with taskLimit=1 sequentially', async () => {
    const calls: number[] = [];
    let i = 0;

    await loopParallel(
      () => i < 5,
      async () => {
        calls.push(i++);
      },
      1,
    );

    expect(calls).toEqual([
      0,
      1,
      2,
      3,
      4,
    ]);
  });

  test('forEachParallel iterates over array in parallel', async () => {
    const values: number[] = [];
    const input = [
      1,
      2,
      3,
      4,
    ];

    const result = await forEachParallel(
      input,
      async (value, index) => {
        values.push(value + index);
      },
      undefined,
      2,
    );

    expect(result).toBe(input);
    expect(values.sort()).toEqual([
      1,
      3,
      5,
      7,
    ]);
  });

  test('forInParallel iterates over object properties', async () => {
    const obj = {
      a: 1,
      b: 2, 
    };
    const keys: string[] = [];

    const result = await forInParallel(
      obj,
      async (value, key) => {
        keys.push(`${key}:${value}`);
      },
      undefined,
      2,
    );

    expect(result).toBe(obj);
    expect(keys.sort()).toEqual(['a:1', 'b:2']);
  });

  test('mapParallel maps array sequentially (taskLimit=1)', async () => {
    const input = [
      1,
      2,
      3,
    ];
    const result = await mapParallel(
      input,
      async (v, i) => v * 2 + i,
      undefined,
      1,
    );

    expect(result).toEqual([
      2,
      5,
      8,
    ]);
  });

  test('mapInParallel maps object to new object (taskLimit=1)', async () => {
    const obj = {
      a: 1,
      b: 2, 
    };
    const result = await mapInParallel(
      obj,
      async (v, key) => v * 3 + (key === 'a' ? 1 : 0),
      undefined,
      1,
    );

    expect(result).toEqual({
      a: 4,
      b: 6, 
    });
  });

  test('filterParallel filters array in parallel', async () => {
    const input = [
      1,
      2,
      3,
      4,
      5,
      6,
    ];
    const result = await filterParallel(
      input,
      async (v) => v % 2 === 0,
      null,
      undefined,
      3,
    );

    expect(result).toEqual([
      2,
      4,
      6,
    ]);
  });

  test('filterInParallel filters object and returns object', async () => {
    const obj = {
      a: 1,
      b: 2,
      c: 3,
      d: 4, 
    };
    const result = await filterInParallel(
      obj,
      async (v) => v % 2 === 0,
      undefined,
      undefined,
      2,
    );

    expect(result).toEqual({
      b: 2,
      d: 4, 
    });
  });

  test('findParallel finds first matching item', async () => {
    const input = [
      1,
      3,
      4,
      6,
    ];
    const found = await findParallel(
      input,
      async (v) => v % 2 === 0,
      undefined,
      2,
    );
    const notFound = await findParallel(
      input,
      async (v) => v > 10,
      undefined,
      2,
    );

    expect(found).toBe(4);
    expect(notFound).toBeUndefined();
  });

  test('findInParallel finds first matching value from object (taskLimit=1)', async () => {
    const obj = {
      a: 1,
      b: 3,
      c: 4, 
    };
    const found = await findInParallel(
      obj,
      async (v) => v % 2 === 0,
      undefined,
      1,
    );

    const notFound = await findInParallel(
      obj,
      async (v) => v > 10,
      undefined,
      1,
    );

    expect(found).toBe(4);
    expect(notFound).toBeUndefined();
  });

  test('reduceParallel reduces array sequentially (taskLimit=1)', async () => {
    const input = [
      1,
      2,
      3,
      4,
    ];
    const sum = await reduceParallel(
      input,
      async (acc, v) => acc + v,
      0,
      undefined,
      1,
    );

    expect(sum).toBe(10);
  });

  test('reduceInParallel reduces object values sequentially (taskLimit=1)', async () => {
    const obj = {
      a: 1,
      b: 2,
      c: 3, 
    };
    const sum = await reduceInParallel(
      obj,
      async (acc, v) => acc + v,
      0,
      undefined,
      1,
    );

    expect(sum).toBe(6);
  });
});
