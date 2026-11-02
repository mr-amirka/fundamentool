import type {
  THook,
} from '../../hooks/types';

/** A value, or a promise of it: what a handler of an async hook may return — the hook treats both alike. */
export type TAwaitable<T> = T | PromiseLike<T>;

/** Every handler is told; nobody answers. It may wait. */
export type TEachHandler<T> = (value: T) => TAwaitable<void>;
/** Each handler gets the previous one's result and may change it; `undefined` keeps it. It may wait. */
export type TWaterfallHandler<T> = (value: T) => TAwaitable<T | undefined>;
/** The first handler that answers (not `undefined`) is the answer. It may wait. */
export type TBailHandler<T, R> = (value: T) => TAwaitable<R | undefined>;
/** Goes on with `next` (`next()` — with the same value): a promise of the answer of the handlers after it. */
export type TChainNext<T, R> = (value?: T) => Promise<R>;
/** Wraps the handlers after it — middleware: awaits `next` to reach them, or answers without them. */
export type TChainHandler<T, R> = (value: T, next: TChainNext<T, R>) => TAwaitable<R>;

/** `eachHook`'s hook. */
export type TEachHook<T> = THook<TEachHandler<T>> & {
  /** Calls every handler with `value` in series, each after the previous one settled; resolves when all are done. */
  run(value: T): Promise<void>;
};

/** `parallelHook`'s hook. */
export type TParallelHook<T> = THook<TEachHandler<T>> & {
  /** Starts every handler with `value` at once, in running order; resolves when every one of them settled. */
  run(value: T): Promise<void>;
};

/** `waterfallHook`'s hook. */
export type TWaterfallHook<T> = THook<TWaterfallHandler<T>> & {
  /** Passes `value` through every handler in series; resolves to what the last one left. */
  run(value: T): Promise<T>;
};

/** `bailHook`'s hook. */
export type TBailHook<T, R> = THook<TBailHandler<T, R>> & {
  /** Asks the handlers in turn; resolves to the first answer, or to `undefined` — nobody knew. */
  run(value: T): Promise<R | undefined>;
};

/** `chainHook`'s hook. */
export type TChainHook<T, R> = THook<TChainHandler<T, R>> & {
  /** Runs the chain; `end` answers when every handler went on with `next`. */
  run(value: T, end: (value: T) => TAwaitable<R>): Promise<R>;
};
