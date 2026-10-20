// The router's state from its stack: which pages are mounted (the shown one and the kept ones), the address, the
// history, the current section (see research web-games 12).
import {
  PAGE,
} from './constants';
import type {
  TEntry,
  TPageEntry,
  TRouterState,
  TWindowEntry,
} from './types';

/** What the state is computed from: the shown stack and the router's settings. */
export type TStateInput = {
  /** The shown stack, bottom to top. */
  entries: readonly TEntry[];
  /** Windows playing their exit. */
  leaving: readonly TWindowEntry[];
  /** Entries left by going back, nearest first (what Forward restores). */
  ahead: readonly TEntry[];
  /** `separate`: every section's stack, by name; empty with `shared`. */
  stacks: ReadonlyMap<string, readonly TEntry[]>;
  /** `separate`: the section shown. */
  shown: string;
  /** Each section keeps its own history. */
  separate: boolean;
  /** At most this many kept pages stay mounted. */
  keepLimit: number;
};

/** The page an entry belongs to: itself, or the page under a window. */
export function pageAt(list: readonly TEntry[], index: number): TPageEntry {
  for (let i = index; i >= 0; i--) {
    if (list[i].kind === PAGE) {
      return list[i] as TPageEntry;
    }
  }
  /* istanbul ignore next -- the bottom entry is always a page */
  throw new Error('routerProvider: no page in the stack');
}

/** The top page of a stack (under the windows, if any). */
export function topPage(list: readonly TEntry[]): TPageEntry {
  return pageAt(list, list.length - 1);
}

/**
 * The router's state from its stack. The pages mounted (`layers`): the top one, plus the ones below it with
 * `info.keep` — of the shown stack first (most recent first), then of the other sections' stacks — at most
 * `keepLimit`, in a stable order (a layer that moved in the DOM would lose its scroll). The current section: the shown
 * one (`separate`), or the top-most page's `info.section` (`shared`).
 *
 * @example
 * const state = computeState({ entries, leaving, ahead, stacks, shown, separate: false, keepLimit: 10 });
 */
export function computeState(input: TStateInput): TRouterState {
  const {
    entries,
    stacks,
    shown,
    separate,
    keepLimit,
  } = input;
  const top = topPage(entries);
  const mounted = new Set<number>([top.id]);
  const layers: TPageEntry[] = [top];
  let kept = 0;
  let section: string | null = separate ? shown : null;
  // The shown stack first (most recent first), then the other sections' stacks.
  const lists = [
    entries,
    ...[...stacks].filter(([name]) => name !== shown).map(([, list]) => list),
  ];
  for (const list of lists) {
    for (let i = list.length - 1; i >= 0; i--) {
      const entry = list[i];
      if (entry.kind !== PAGE) {
        continue;
      }
      if (!separate && list === entries) {
        section ??= entry.info.section ?? null;
      }
      if (!mounted.has(entry.id) && entry.info.keep && kept < keepLimit) {
        mounted.add(entry.id);
        layers.push(entry);
        kept++;
      }
    }
  }
  layers.sort((a, b) => a.id - b.id);
  const depth = entries.length - 1;
  return {
    depth,
    prev: depth > 0 ? pageAt(entries, depth - 1).location : null,
    location: top.location,
    history: entries.map((_, index) => pageAt(entries, index).location),
    entries: entries as TEntry[],
    leaving: input.leaving as TWindowEntry[],
    ahead: input.ahead as TEntry[],
    layers,
    page: top,
    section,
  };
}
