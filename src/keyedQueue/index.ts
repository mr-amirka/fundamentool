/**
 * A keyed background queue (fundamentool D-106): work put under a key, one item per key, the highest priority run
 * first by one worker at a time — what a key is and what goes first are the caller's.
 */
import {
  boolean,
  custom,
  func,
  lazy,
  object,
} from '../schema';

const WHERE = '[fundamentool/keyedQueue]';

/** One item of the queue as its worker gets it. */
export type TQueued<K, V> = {
  /** What it is about — one item per key. */
  key: K;
  /** The latest value put under its key. */
  value: V;
  /** The highest priority it was put with: the higher, the sooner. */
  priority: number;
};

/** `keyedQueue`'s options. */
export type TKeyedQueueOptions<K, V> = {
  /**
   * The worker: a batch of items, the highest priority first (equal ones in the order their keys were first put). Its
   * signal aborts on `stop`, and on preemption (`preempt`) — a preempted batch is put back, so the worker may stop
   * halfway: what it did stays done, and the same items come again.
   */
  run: (batch: readonly TQueued<K, V>[], signal: AbortSignal) => Promise<void> | void;
  /** Items per run, at most: an integer from 1, or `Infinity` — all queued (default 1). */
  batch?: number;
  /** An item put above the running batch's lowest priority aborts the run, and the batch is put back (default `false`). */
  preempt?: boolean;
  /** Told each failed run — not one stopped or preempted — with its batch, whose items are dropped (put them again). */
  onError?: (error: unknown, batch: readonly TQueued<K, V>[]) => void;
};

/** The queue. */
export type TKeyedQueue<K, V> = {
  /**
   * Puts an item (default priority 0). A key already queued stays one item: the latest value, the higher priority, its
   * place among equals the first put's. A key whose batch runs now is queued again, to run after it. Nothing after
   * `stop`.
   */
  put(key: K, value: V, priority?: number): void;
  /** Takes a queued item out; `false` — none under the key (a running batch's items aren't queued). */
  delete(key: K): boolean;
  /** Whether an item is queued under the key. */
  has(key: K): boolean;
  /** How many items are queued, the running batch's not counted. */
  size(): number;
  /** Whether a run goes now, or items wait. */
  busy(): boolean;
  /** The last failed run's error; `undefined` — the last run ended well, or none failed. */
  error(): unknown;
  /** Resolves when nothing is queued and no run goes. */
  settled(): Promise<void>;
  /** Drops what is queued, aborts the run going and waits for it; nothing runs after. Idempotent. */
  stop(): Promise<void>;
};

const OPTIONS = /*#__PURE__*/ lazy(() => object({
  run: func(),
  batch: custom<number>((value) => value === Infinity || (Number.isInteger(value) && (value as number) >= 1),
    'an integer from 1, or Infinity').optional(),
  preempt: boolean().optional(),
  onError: func().optional(),
}));

/** An item queued: its order of first put. */
type TItem<K, V> = TQueued<K, V> & { order: number };

/**
 * A keyed background queue: put work under a key with a priority; one worker takes the highest first, a batch at a
 * time. The same key put again before it runs is one item — so work that comes in bursts (a file saved five times, a
 * node changed twice) is done once, with its latest value.
 *
 * @param options - `run` the worker; `batch`, `preempt`, `onError` (see `TKeyedQueueOptions`).
 * @returns The queue, idle until the first `put`.
 * @throws {TypeError} In development, an unknown option ("did you mean") or a value that isn't one.
 * @example
 * const queue = keyedQueue<string, string>({
 *   run: async (batch, signal) => { await reindex(batch.map((item) => item.key), signal); },
 *   batch: Infinity,
 *   preempt: true,
 * });
 * queue.put('docs/a.md', 'watched', 1);
 * queue.put('docs/a.md', 'edited', 2);  // still one item: priority 2, value 'edited'
 * queue.put('*', 'sweep', 0);           // runs after, unless a higher one preempts it
 * await queue.settled();
 */
export function keyedQueue<K, V>(options: TKeyedQueueOptions<K, V>): TKeyedQueue<K, V> {
  if (process.env.NODE_ENV !== 'production') {
    OPTIONS().parse(options, `${WHERE} keyedQueue`);
  }
  const {
    run,
    onError,
  } = options;
  const most = options.batch ?? 1;
  const preempt = options.preempt === true;
  const items = new Map<K, TItem<K, V>>();
  const waiters: (() => void)[] = [];
  let order = 0;
  let stopped = false;
  let failed: unknown;
  let loop: Promise<void> | undefined;
  let running: { batch: readonly TItem<K, V>[];
    controller: AbortController;
    lowest: number;
    preempted: boolean } | undefined;

  /** Puts an item under its key, merged with one queued there. */
  const merge = (item: TItem<K, V>, latest: boolean): void => {
    const queued = items.get(item.key);
    if (queued === undefined) {
      items.set(item.key, item);
      return;
    }
    queued.priority = Math.max(queued.priority, item.priority);
    queued.order = Math.min(queued.order, item.order);
    if (latest) {
      queued.value = item.value;
    }
  };

  /** The next batch, taken out of the queue: the highest priority first, the earliest among equals. */
  const take = (): TItem<K, V>[] => {
    const all = [...items.values()].sort((a, b) => b.priority - a.priority || a.order - b.order);
    const batch = all.length > most ? all.slice(0, most) : all;
    for (const item of batch) {
      items.delete(item.key);
    }
    return batch;
  };

  const go = async (): Promise<void> => {
    // The queue changes while a run goes: it is asked again after each.
    for (let batch = take(); batch.length > 0 && !stopped; batch = take()) {
      const current = {
        batch,
        controller: new AbortController(),
        lowest: batch[batch.length - 1].priority,
        preempted: false,
      };
      running = current;
      try {
        await run(batch.map(({
          key, value, priority,
        }) => ({
          key,
          value,
          priority,
        })), current.controller.signal);
        if (!current.preempted) {
          failed = undefined;
        }
      } catch (error) {
        if (!stopped && !current.preempted) {
          failed = error;
          onError?.(error, batch);
        }
      } finally {
        running = undefined;
      }
      if (current.preempted && !stopped) {
        // Put back under the items put since: their values are newer.
        for (const item of batch) {
          merge(item, false);
        }
      }
    }
  };

  const start = (): void => {
    loop ??= go().finally(() => {
      loop = undefined;
      // An item put between the loop's last check and here: run now.
      if (items.size > 0 && !stopped) {
        start();
        return;
      }
      for (const resolve of waiters.splice(0)) {
        resolve();
      }
    });
  };

  return {
    put(
      key, value, priority = 0,
    ) {
      if (stopped) {
        return;
      }
      merge({
        key,
        value,
        priority,
        order: order++,
      }, true);
      if (preempt && running !== undefined && !running.preempted && priority > running.lowest) {
        running.preempted = true;
        running.controller.abort(new Error(`${WHERE} preempted by a higher priority`));
      }
      start();
    },
    delete: (key) => items.delete(key),
    has: (key) => items.has(key),
    size: () => items.size,
    busy: () => loop !== undefined,
    error: () => failed,
    settled: () => (loop === undefined ? Promise.resolve() : new Promise<void>((resolve) => {
      waiters.push(resolve);
    })),
    async stop() {
      stopped = true;
      items.clear();
      running?.controller.abort(new Error(`${WHERE} stopped`));
      await loop;
    },
  };
}
