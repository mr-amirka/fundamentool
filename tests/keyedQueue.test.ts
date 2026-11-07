/**
 * `keyedQueue` (fundamentool D-106): one item per key, the highest priority first, a batch at a time by one worker;
 * preemption puts the batch back; a failure kept, never halting the queue; `stop` final.
 */
import {
  keyedQueue,
} from '../src/keyedQueue';
import type {
  TQueued,
} from '../src/keyedQueue';

/** A promise and its resolve: a run held until the test lets it go. */
function gate(): { promise: Promise<void>;
  open: () => void } {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return {
    promise,
    open,
  };
}

/** The keys of each run's batch. */
const keysOf = (runs: readonly (readonly TQueued<string, unknown>[])[]): string[][] => runs.map((batch) => batch.map((item) => item.key));

describe('keyedQueue', () => {
  test('one item per key: the latest value, the higher priority; the highest first, equals in their first put\'s order',
    async () => {
      const held = gate();
      const runs: TQueued<string, string>[][] = [];
      const queue = keyedQueue<string, string>({
        run: async (batch) => {
          runs.push([...batch]);
          if (runs.length === 1) {
            await held.promise;
          }
        },
      });
      queue.put('first', 'v');
      // The first runs at once; the rest wait behind it.
      queue.put('b', 'b1');
      queue.put(
        'c', 'c1', 1,
      );
      queue.put(
        'b', 'b2', 2,
      );
      queue.put(
        'd', 'd1', 1,
      );
      queue.put('c', 'c2');
      expect(queue.size()).toBe(3);
      expect(queue.has('b')).toBe(true);
      expect(queue.busy()).toBe(true);
      held.open();
      await queue.settled();
      expect(runs.slice(1)).toEqual([
        [
          {
            key: 'b',
            value: 'b2',
            priority: 2,
          },
        ],
        [
          {
            key: 'c',
            value: 'c2',
            priority: 1,
          },
        ],
        [
          {
            key: 'd',
            value: 'd1',
            priority: 1,
          },
        ],
      ]);
      expect(queue.busy()).toBe(false);
      expect(queue.size()).toBe(0);
    });

  test('batch: so many at a time; Infinity — all queued (the first put runs at once, the rest gather behind it)',
    async () => {
      /** The batches' keys of a queue whose first run waits while `keys` are put. */
      const batches = async (batch: number): Promise<string[][]> => {
        const held = gate();
        const runs: TQueued<string, number>[][] = [];
        const queue = keyedQueue<string, number>({
          run: async (items) => {
            runs.push([...items]);
            if (runs.length === 1) {
              await held.promise;
            }
          },
          batch,
        });
        for (const key of [
          'first',
          'a',
          'b',
          'c',
        ]) {
          queue.put(key, 0);
        }
        held.open();
        await queue.settled();
        return keysOf(runs);
      };
      expect(await batches(2)).toEqual([
        ['first'],
        [
          'a',
          'b',
        ],
        ['c'],
      ]);
      expect(await batches(Infinity)).toEqual([
        ['first'],
        [
          'a',
          'b',
          'c',
        ],
      ]);
    });

  test('a key put while its batch runs is queued again, to run after it', async () => {
    const held = gate();
    const values: number[] = [];
    const queue = keyedQueue<string, number>({
      run: async (batch) => {
        values.push(batch[0].value);
        if (values.length === 1) {
          await held.promise;
        }
      },
    });
    queue.put('a', 1);
    queue.put('a', 2);
    expect(queue.has('a')).toBe(true);
    held.open();
    await queue.settled();
    expect(values).toEqual([
      1,
      2,
    ]);
  });

  test('preempt: a higher priority aborts the run; its batch is put back under what was put since', async () => {
    const runs: TQueued<string, string>[][] = [];
    const queue = keyedQueue<string, string>({
      run: async (batch, signal) => {
        runs.push([...batch]);
        if (runs.length === 1) {
          await new Promise<void>((resolve) => {
            signal.addEventListener('abort', () => {
              resolve();
            });
          });
          expect(signal.reason).toEqual(new Error('[fundamentool/keyedQueue] preempted by a higher priority'));
        }
      },
      batch: Infinity,
      preempt: true,
    });
    queue.put(
      'embed', 'all', 0,
    );
    queue.put(
      'sweep', 'old', 0,
    );
    // Not above the batch's lowest: no preemption.
    queue.put(
      'other', 'x', 0,
    );
    await Promise.resolve();
    expect(runs).toHaveLength(1);
    queue.put(
      'sweep', 'new', 1,
    );
    queue.put(
      'file', 'a.md', 2,
    );
    await queue.settled();
    expect(runs[1]).toEqual([
      {
        key: 'file',
        value: 'a.md',
        priority: 2,
      },
      {
        key: 'sweep',
        value: 'new',
        priority: 1,
      },
      {
        key: 'embed',
        value: 'all',
        priority: 0,
      },
      {
        key: 'other',
        value: 'x',
        priority: 0,
      },
    ]);
    expect(queue.error()).toBeUndefined();
  });

  test('without preempt, a higher priority waits for the run', async () => {
    const held = gate();
    let aborted = false;
    const queue = keyedQueue<string, number>({
      run: async (_batch, signal) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        await held.promise;
      },
    });
    queue.put('a', 0);
    queue.put(
      'b', 0, 5,
    );
    held.open();
    await queue.settled();
    expect(aborted).toBe(false);
  });

  test('a failed run: its error kept and told with its batch; the queue goes on; a run that ends well clears it',
    async () => {
      const told: [unknown, string[]][] = [];
      const queue = keyedQueue<string, boolean>({
        run: (batch) => {
          if (batch[0].value) {
            throw new Error('boom');
          }
        },
        onError: (error, batch) => {
          told.push([
            error,
            batch.map((item) => item.key),
          ]);
        },
      });
      queue.put('bad', true);
      queue.put('next', true);
      await queue.settled();
      expect((queue.error() as Error).message).toBe('boom');
      expect(told.map(([, keys]) => keys)).toEqual([
        ['bad'],
        ['next'],
      ]);
      queue.put('good', false);
      await queue.settled();
      expect(queue.error()).toBeUndefined();
    });

  test('a failure with no onError is only kept', async () => {
    const queue = keyedQueue<string, number>({
      run: async () => {
        throw new Error('quiet');
      },
    });
    queue.put('a', 1);
    await queue.settled();
    expect((queue.error() as Error).message).toBe('quiet');
  });

  test('stop: the run aborted and waited for, the queue dropped, no failure kept, nothing after; twice is harmless',
    async () => {
      const keys: string[] = [];
      const queue = keyedQueue<string, number>({
        run: async (batch, signal) => {
          keys.push(batch[0].key);
          await new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              reject(signal.reason);
            });
          });
        },
      });
      queue.put('a', 1);
      queue.put('b', 1);
      await queue.stop();
      await queue.stop();
      queue.put('c', 1);
      await queue.settled();
      expect(keys).toEqual(['a']);
      expect(queue.size()).toBe(0);
      expect(queue.busy()).toBe(false);
      expect(queue.error()).toBeUndefined();
    });

  test('delete takes a queued item out; settled is at once when idle', async () => {
    const held = gate();
    const keys: string[] = [];
    const queue = keyedQueue<string, number>({
      run: async (batch) => {
        keys.push(batch[0].key);
        await held.promise;
      },
    });
    await queue.settled();
    queue.put('a', 1);
    queue.put('b', 1);
    expect(queue.delete('b')).toBe(true);
    expect(queue.delete('a')).toBe(false); // running, not queued
    held.open();
    await queue.settled();
    expect(keys).toEqual(['a']);
  });

  test('an item put as the loop ends is run, not lost', async () => {
    const held = gate();
    const keys: string[] = [];
    const queue = keyedQueue<string, number>({
      run: (batch) => {
        keys.push(batch[0].key);
        return keys.length === 1 ? held.promise : undefined;
      },
    });
    queue.put('a', 1);
    void held.promise.then(() => {
      queue.put('b', 1);
    });
    held.open();
    await held.promise;
    await queue.settled();
    expect(keys).toEqual([
      'a',
      'b',
    ]);
  });

  test.each([
    [
      {
        run: () => undefined,
        bacth: 2,
      },
      'Did you mean "batch"?',
    ],
    [
      {
        run: () => undefined,
        batch: 0,
      },
      'an integer from 1, or Infinity',
    ],
    [
      {
        run: 'x',
      },
      'run',
    ],
  ])('options checked: %j', (options, message) => {
    expect(() => keyedQueue(options as never)).toThrow(message);
  });
});
