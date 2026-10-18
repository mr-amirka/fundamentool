import {
  assertKnownOptions,
} from './assertKnownOptions';
import {
  describeValue,
} from './describeValue';
import {
  isDefined,
} from './is/isDefined';
import {
  isFunction,
} from './is/isFunction';
import {
  isNumber,
} from './is/isNumber';
import {
  isObject,
} from './is/isObject';
import {
  wait,
} from './wait';

/** Options of {@link withAsyncLock}. */
export type TWithAsyncLockOptions = {
  /** The lock lasts at least this long from the call's start, ms (default 0 — just while the call runs). */
  minMs?: number;
};

/** The single list of accepted keys of {@link TWithAsyncLockOptions}. */
export const WITH_ASYNC_LOCK_OPTION_KEYS = ['minMs'] as const;

const WHERE = '[fundamentool] withAsyncLock';

/** Checks the arguments once, at creation (lab convention `api-input-validation.md`). */
function assertArguments(fn: unknown, options: unknown): void {
  if (!isFunction(fn)) {
    throw new TypeError(`${WHERE}: expects a function, got ${describeValue(fn)}`);
  }
  if (!isDefined(options)) {
    return;
  }
  if (!isObject(options)) {
    throw new TypeError(`${WHERE}: expects an options object, got ${describeValue(options)}`);
  }
  assertKnownOptions(
    WHERE, options, WITH_ASYNC_LOCK_OPTION_KEYS,
  );
  const minMs = (options as TWithAsyncLockOptions).minMs;
  if (isDefined(minMs) && !(isNumber(minMs) && minMs >= 0 && Number.isFinite(minMs))) {
    throw new TypeError(`${WHERE}: option "minMs" expects a number ≥ 0, got ${describeValue(minMs)}`);
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
