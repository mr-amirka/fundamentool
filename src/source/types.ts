/**
 * Writes one string a reader found into the caller's list: the whole string, or what the caller makes of it (minotation
 * splits a class list into tokens). The reader truncates `out` back to an earlier length when a string turns out not
 * to be a value (`'splash'` in `v === 'splash' ? 'a' : 'b'`), so whatever `push` adds must be array elements.
 */
export type TStringPush<O extends unknown[]> = (out: O, text: string) => void;

/** Reads one comment `[from, to)` of `source` into the caller's `out`: what a comment says (minotation's `@mn`). */
export type TCommentVisit<O> = (out: O, source: string, from: number, to: number) => void;

/**
 * Where strings are read, by name. A name is exact (`className`) or a pattern `*Ending` (`*ClassName` — any name that
 * ends with `ClassName` and has at least one character before it).
 */
export type TStringPlaces = {
  /** Attributes and object keys: `class="…"`, `className={…}`, `{ className: '…' }`; inside a string too. */
  attrs?: readonly string[];
  /** Variables and object keys: `const rowClass = '…'`, `const rowClass: string = '…'`, `{ rowClass: '…' }`. */
  variables?: readonly string[];
  /** The string arguments of calls, nested ones included: `mne(base, 'p10')`. Not a method: `obj.mne(…)`. */
  calls?: readonly string[];
};

/** Reads a file's strings at its places into `out`. */
export type TSourceStrings = <O extends unknown[]>(source: string, out: O, push: TStringPush<O>) => void;

/** An edit by positions of the original text: `[from, to, text]` — an insertion when `from === to`. */
export type TSourceEdit = [from: number, to: number, text: string];

/** A part of a single-file component: `0` — markup, `1` — a TS script, `2` — a TSX script; `[from, to)`. */
export type TSfcPart = [kind: 0 | 1 | 2, from: number, to: number];

/** A range of the text: `[from, to)`. */
export type TSourceRange = [from: number, to: number];
