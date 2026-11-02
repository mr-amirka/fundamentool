/** Where a handler goes among the others: `pre` before all, `post` after all; without it — by the kind's rule. */
export type THookOrder = 'pre' | 'post';

/** How a handler is added. */
export type THookAddOptions = {
  /** Before (`pre`) or after (`post`) every handler added without it. */
  order?: THookOrder;
  /** Who added it — a preset's name; an error of the handler names it. */
  by?: string;
};

/** How a hook is made. */
export type THookOptions = {
  /** The hook's name in its errors: `[documents] beforeWrite`; `hook` by default. */
  name?: string;
};

/** Removes what was added; a second call does nothing. */
export type TRemoval = () => void;

/** What every hook has, sync or async: handlers added and removed, and how many there are. */
export type THook<H> = {
  /**
   * Adds a handler; a run already going on doesn't see it.
   *
   * @returns Its removal.
   */
  add(handler: H, options?: THookAddOptions): TRemoval;
  /** The number of handlers: `0` — a host may skip the work the hook is for. */
  readonly size: number;
};

/** Every handler is told; nobody answers. */
export type TEachHandler<T> = (value: T) => void;
/** Each handler gets the previous one's result and may change it; `undefined` keeps it. */
export type TWaterfallHandler<T> = (value: T) => T | undefined;
/** The first handler that answers (not `undefined`) is the answer. */
export type TBailHandler<T, R> = (value: T) => R | undefined;
/** Goes on with `next` (`next()` — with the same value): the answer of the handlers after it. */
export type TChainNext<T, R> = (value?: T) => R;
/** Wraps the handlers after it — middleware: calls `next` to reach them, or answers without them. */
export type TChainHandler<T, R> = (value: T, next: TChainNext<T, R>) => R;

/** `eachHook`'s hook. */
export type TEachHook<T> = THook<TEachHandler<T>> & {
  /** Calls every handler with `value`, in running order. */
  run(value: T): void;
};

/** `waterfallHook`'s hook. */
export type TWaterfallHook<T> = THook<TWaterfallHandler<T>> & {
  /** Passes `value` through every handler; returns what the last one left. */
  run(value: T): T;
};

/** `bailHook`'s hook. */
export type TBailHook<T, R> = THook<TBailHandler<T, R>> & {
  /** Asks the handlers in turn; returns the first answer, or `undefined` — nobody knew. */
  run(value: T): R | undefined;
};

/** `chainHook`'s hook. */
export type TChainHook<T, R> = THook<TChainHandler<T, R>> & {
  /** Runs the chain; `end` answers when every handler went on with `next`. */
  run(value: T, end: (value: T) => R): R;
};

/** The handler a hook takes. */
export type THandlerOf<H> = H extends THook<infer F> ? F : never;

/** Hooks by key, made on first use (`hookMap`). */
export type THookMap<K extends string, H> = {
  /** The key's hook: made by `create` the first time. */
  for(key: K): H;
  /** The key's hook if it was made; `undefined` otherwise. */
  get(key: K): H | undefined;
  /** The keys whose hooks were made, in the order they were. */
  keys(): K[];
};

/** A host's hooks by name, for its presets (`namedHooks`). */
export type TNamedHooks<M extends Record<string, THook<any>>> = {
  /**
   * Adds `handler` to the hook `name`.
   *
   * @throws {TypeError} an unknown name, with the nearest known one.
   */
  add<N extends keyof M & string>(name: N, handler: THandlerOf<M[N]>, options?: THookAddOptions): TRemoval;
  /** Whether the host has a hook of that name. */
  has(name: string): boolean;
  /** The names of the host's hooks. */
  names(): string[];
};

/** A preset as an object: it has a name, can require others, and sets the host up. */
export type TPresetObject<H> = {
  /** Unique among the host's presets; others `require` it by it. */
  name: string;
  /** The presets that must be set up before this one. */
  requires?: readonly string[];
  /** Adds the preset's handlers, operators, … to the host. */
  setup(host: H): void;
};

/** A preset: a function of the host, or an object with a name. */
export type TPreset<H> = ((host: H) => void) | TPresetObject<H>;

/** How `orderPresets` orders. */
export type TOrderPresetsOptions = {
  /** The presets set up by earlier calls, by name: they satisfy `requires`, and aren't returned again. */
  connected?: Readonly<Record<string, object>>;
  /** The prefix of a message: `[documents] documentsProvider`. */
  where?: string;
};
