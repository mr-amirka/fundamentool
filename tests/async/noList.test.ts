/**
 * The async helpers given no list (`null`, `undefined` — data that hasn't come): they settle as for an empty one, and
 * never call the iteratee.
 */
import {
  filterAsync,
  findAsync,
  findInParallel,
  findParallel,
  forEachAsync,
  forEachParallel,
  forInParallel,
  mapAsync,
  mapParallel,
  reduceAsync,
  reduceParallel,
} from '../../src/async';

describe('async helpers — no list', () => {
  const never = () => {
    throw new Error('called');
  };

  it.each([
    [
      'filterAsync',
      () => filterAsync(
        null as never, never, null,
      ),
      [],
    ],
    [
      'findAsync',
      () => findAsync(null as never, never),
      undefined,
    ],
    [
      'forEachAsync',
      () => forEachAsync(null as never, never),
      null,
    ],
    [
      'mapAsync',
      () => mapAsync(null as never, never),
      [],
    ],
    [
      'reduceAsync',
      () => reduceAsync(
        null as never, never, 7,
      ),
      7,
    ],
    [
      'findParallel',
      () => findParallel(null as never, never),
      undefined,
    ],
    [
      'forEachParallel',
      () => forEachParallel(null as never, never),
      null,
    ],
    [
      'mapParallel',
      () => mapParallel(null as never, never),
      [],
    ],
    [
      'reduceParallel',
      () => reduceParallel(
        null as never, never, 7,
      ),
      7,
    ],
    [
      'findInParallel',
      () => findInParallel(null as never, never),
      undefined,
    ],
    [
      'forInParallel',
      () => forInParallel(undefined as never, never),
      undefined,
    ],
  ])('%s settles as for an empty list', async (
    _name, run, expected,
  ) => {
    await expect((run as () => Promise<unknown>)()).resolves.toEqual(expected);
  });
});
