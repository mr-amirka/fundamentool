import {
  mapAsync, 
} from '../src/async/mapAsync';
import {
  filterAsync, 
} from '../src/async/filterAsync';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('async map', () => {
  test('maps over array preserving order', async () => {
    const res = await mapAsync([
      1,
      2,
      3,
    ], async (v) => {
      await wait(1);
      return v * 2;
    });

    expect(res).toEqual([
      2,
      4,
      6,
    ]);
  });
});

describe('async filter', () => {
  test('filters array', async () => {
    const res = await filterAsync(
      [
        1,
        2,
        3,
        4,
      ], async (v) => {
        await wait(1);
        return v % 2 === 0;
      }, null,
    );

    expect(res).toEqual([2, 4]);
  });
});
