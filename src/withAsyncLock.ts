import {
  func,
  number,
  object,
} from './schema';
import {
  wait,
} from './wait';

/** Options of {@link withAsyncLock}. */
export type TWithAsyncLockOptions = {
  /** The lock lasts at least this long from the call's start, ms (default 0 — just while the call runs). */
  minMs?: number;
};

/** {@link withAsyncLock}'s options (D-051). */
const OPTIONS = object({
  minMs: number().finite().min(0).optional(),
});

/** The single list of accepted keys of {@link TWithAsyncLockOptions}. */
export const WITH_ASYNC_LOCK_OPTION_KEYS = OPTIONS.keys;

const WHERE = '[fundamentool] withAsyncLock';

/** Checks the arguments once, at creation (lab convention `api-input-validation.md`); `null` options — none. */
function assertArguments(fn: unknown, options: unknown): void {
  func().parse(fn, WHERE);
  if (options !== null) {
    OPTIONS.optional().parse(options, WHERE);
  }
}

/**
 * Wraps an async function so that calls made while one runs — and within `minMs` of its start — are ignored: they
 * resolve `undefined` at once and `fn` isn't called. The async counterpart of `withLock`: against a double tap on a
 * button or a link. The lock is released however the call ends (a result, an error).
 *
 * @param fn - The function to protect.
 * @param options - `minMs`: the shortest lock, from the call's start.
 * @returns The locked version of `fn`.
 * @example
 * const save = withAsyncLock((data) => api.save(data), { minMs: 300 });
 * save(a); // runs
 * save(b); // ignored: the first is still running, or less than 300 ms have passed — resolves undefined
 */
export function withAsyncLock<A extends unknown[], R>(fn: (...args: A) => R | Promise<R>,
  options?: TWithAsyncLockOptions): (...args: A) => Promise<R | undefined> {
  assertArguments(fn, options);
  const minMs = options?.minMs ?? 0;
  let locked = false;
  return async function (this: unknown): Promise<R | undefined> {
    if (locked) {
      return undefined;
    }
    locked = true;
    const pause = minMs > 0 ? wait(minMs) : null;
    try {
      return await fn.apply(this, arguments as unknown as A);
    } finally {
      // The caller gets the result at once; only the lock waits out the rest of `minMs`.
      if (pause) {
        void pause.then(() => {
          locked = false;
        });
      } else {
        locked = false;
      }
    }
  };
}
