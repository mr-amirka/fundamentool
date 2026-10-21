// The navigator's state from its stack: which pages are mounted (the shown one and the kept ones), the tab shown.
import {
  PAGE,
} from './constants';
import type {
  TEntry,
  TNavigatorState,
  TPageEntry,
  TUrlProps,
  TWindowEntry,
} from './types';

/** What the state is computed from. */
export type TStateInput = {
  /** The shown stack, bottom to top. */
  entries: readonly TEntry[];
  /** Windows playing their exit. */
  leaving: readonly TWindowEntry[];
  /** Entries left by going back, nearest first (what Forward restores). */
  ahead: readonly TEntry[];
  /** Every tab's stack, by name (empty without tabs). */
  stacks: ReadonlyMap<string, readonly TEntry[]>;
  /** The tab shown; `null` without tabs. */
  shown: string | null;
  /** At most this many kept pages stay mounted. */
  keepLimit: number;
  /** Some entry of any section has a leave guard. */
  anyLeaveGuarded: boolean;
  /** The location held behind a closed gate (D-050). */
  held: TUrlProps | null;
};

/**
 * The place of the page an entry belongs to: its own, or the page's under a window.
 *
 * @example
 * pageIndexAt(entries, entries.length - 1); // the top page's place
 */
export function pageIndexAt(list: readonly TEntry[], index: number): number {
  for (let i = index; i >= 0; i--) {
    if (list[i].kind === PAGE) {
      return i;
    }
  }
  /* istanbul ignore next -- the bottom entry is always a page */
  throw new Error('[fundamentool] createNavigator: no page in the stack');
}

/** The page an entry belongs to: itself, or the page under a window. */
export function pageAt(list: readonly TEntry[], index: number): TPageEntry {
  return list[pageIndexAt(list, index)] as TPageEntry;
}

/** The top page of a stack (under the windows, if any). */
export function topPage(list: readonly TEntry[]): TPageEntry {
  return pageAt(list, list.length - 1);
}

/**
 * The navigator's state from its stack. The pages mounted (`layers`): the top one, plus the ones below it whose row
 * keeps them (`keep`) and that were shown since a reload (not `dormant`) — of the shown stack first (most recent
 * first), then of the other tabs' stacks — at most `keepLimit`, in a stable order (a layer that moved in the DOM would
 * lose its scroll).
 *
 * @example
 * const state = computeState({ entries, leaving, ahead, stacks, shown: null, keepLimit: DEFAULT_KEEP, anyLeaveGuarded: false, held: null });
 */
export function computeState(input: TStateInput): TNavigatorState {
  const {
    entries,
    stacks,
    shown,
    keepLimit,
  } = input;
  const top = topPage(entries);
  const mounted = new Set<number>([top.id]);
  const layers: TPageEntry[] = [top];
  let kept = 0;
  // The shown stack first (most recent first), then the other tabs' stacks.
  const lists = [
    entries,
    ...[...stacks].filter(([name]) => name !== shown).map(([, list]) => list),
  ];
  for (const list of lists) {
    for (let i = list.length - 1; i >= 0; i--) {
      const entry = list[i];
      if (entry.kind === PAGE && !mounted.has(entry.id) && entry.row?.keep && !entry.dormant && kept < keepLimit) {
        mounted.add(entry.id);
        layers.push(entry);
        kept++;
      }
    }
  }
  layers.sort((a, b) => a.id - b.id);
  return {
    depth: entries.length - 1,
    location: top.location,
    entries,
    leaving: input.leaving,
    ahead: input.ahead,
    layers,
    page: top,
    section: shown,
    anyLeaveGuarded: input.anyLeaveGuarded,
    held: input.held,
  };
}
