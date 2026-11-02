import {
  WHERE,
  checkAdd,
} from './options';
import type {
  THookAddOptions,
  THookOptions,
  TRemoval,
} from './types';

/** The rank of a handler without `order`; `pre` comes before it, `post` after. */
const NORMAL = 1;
const RANK = {
  pre: 0,
  post: 2,
};

/** A hook's name when its options give none. */
const NAMELESS = 'hook';

/** A handler as kept: [handler, by, rank, the order it was added in]. */
type TEntry<S> = [handler: S, by: string | undefined, rank: number, added: number];

/** The handlers in running order, and who added each — replaced whole, so a run keeps the one it started with. */
type TRunList<S> = [handlers: S[], bys: (string | undefined)[]];

/** What a hook of any kind keeps. */
export type TList<S> = {
  name: string;
  current: TRunList<S>;
};

/** How a hook's handler is kept: as given, or wrapped (a chain's link) — at `add`, so a run does no extra work. */
export type TKeep<H, S> = (handler: H, by: string | undefined, name: string) => S;

/** No error has passed out of `next` yet. */
export const NOTHING_PASSED = Symbol('nothing passed');

/** Keeps a handler as it was given. */
export const asIs = <H>(handler: H): H => handler;

/**
 * The error a handler's throw becomes: named by the hook and by who added the handler (lab D-044 point 6 — reported
 * where it happened, never swallowed).
 *
 * @param name - The hook's name.
 * @param by - Who added the handler.
 * @param error - What it threw; kept as `cause`.
 * @returns `[documents] beforeWrite: the handler of presetLabRecords threw: …`.
 */
export function hookError(
  name: string, by: string | undefined, error: unknown,
): Error {
  const text = error instanceof Error ? error.message : String(error);
  return new Error(`${name}: ${by === undefined ? 'a handler' : `the handler of ${by}`} threw: ${text}`, {
    cause: error,
  });
}

/**
 * The handlers of one hook: kept sorted by `order`, then by the order of adding — the earliest first, or the latest
 * (`latestFirst`) for the kinds where a later handler has the last word by being asked first.
 *
 * @param options - The hook's options; only `name` is read here.
 * @param latestFirst - `bail` and `chain`: the latest added is asked first.
 * @param keep - How a handler is kept.
 * @returns The list a run reads, and `add`.
 */
export function handlerList<H, S>(
  options: THookOptions | undefined,
  latestFirst: boolean,
  keep: TKeep<H, S>,
): [list: TList<S>, add: (handler: H, addOptions?: THookAddOptions) => TRemoval] {
  const list: TList<S> = {
    name: options?.name || NAMELESS,
    current: [
      [],
      [],
    ],
  };
  let entries: TEntry<S>[] = [];
  let added = 0;
  const direction = latestFirst ? -1 : 1;
  const rebuild = (): void => {
    const sorted = entries.slice().sort((a, b) => a[2] - b[2] || (a[3] - b[3]) * direction);
    list.current = [
      sorted.map((entry) => entry[0]),
      sorted.map((entry) => entry[1]),
    ];
  };
  const add = (handler: H, addOptions?: THookAddOptions): TRemoval => {
    checkAdd(
      handler, addOptions, `${list.name} add`,
    );
    const by = addOptions?.by;
    const order = addOptions?.order;
    const entry: TEntry<S> = [
      keep(
        handler, by, list.name,
      ),
      by,
      order ? RANK[order] : NORMAL,
      added++,
    ];
    entries = entries.concat([entry]);
    rebuild();
    return () => {
      if (entries.includes(entry)) {
        entries = entries.filter((kept) => kept !== entry);
        rebuild();
      }
    };
  };
  return [
    list,
    add,
  ];
}

/** `[fundamentool/hooks] eachHook` — the prefix of a factory's option errors. */
export const whereOf = (kind: string): string => `${WHERE} ${kind}`;
