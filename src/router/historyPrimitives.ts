// History primitives (fundamentool D-039): one timeline of entries, each entry in three nested parts — the address
// (path + query) ⊃ its hash ⊃ the entry's own state. A primitive is one part: it reads, writes and moves through it,
// and hides how the browser (or an array) does that. The parts of one timeline are kept in step by one provider.
import {
  attachEvent,
} from '../attachEvent';
import {
  isObject,
} from '../is/isObject';
import {
  urlParse,
} from '../urlParse';
import type {
  TUrlProps,
} from '../urlParse';
import {
  HASH_PART,
  ROOT_PATH,
  STATE_PART,
  URL_PART,
} from './constants';
import type {
  THistoryEntry,
  THistoryPart,
  THistoryPrimitive,
  THistoryPrimitives,
  TMemoryHistoryPrimitives,
} from './types';

/** The parts, outer first: a step in one clears the ones after it. */
const PARTS: readonly THistoryPart[] = [
  URL_PART,
  HASH_PART,
  STATE_PART,
];

/** The shape of the state this module writes into an entry; a new shape — a new number (older entries read as foreign). */
const ENTRY_FORMAT = 2;

/** What a timeline keeps in an entry besides its address: our mark, the entry's place, each part's data. */
type TEntryState = {
  fundamentool: typeof ENTRY_FORMAT;
  index: number;
  /** The `state` part's location. */
  state: string;
  data: Partial<Record<THistoryPart, unknown>>;
  /** Each part's revision, new whenever the part is written: two entries compare a part's data in one step. */
  rev: Partial<Record<THistoryPart, string>>;
};

/** An entry as a driver stores it: the address's two parts and whatever state the entry has. */
type TStoredEntry = {
  url: string;
  hash: string;
  state: unknown;
};

/** An entry with our state. */
type TRawEntry = TStoredEntry & {
  state: TEntryState;
};

/** How a timeline is stored: the browser's history or an array. */
type TTimelineDriver = {
  read(): TStoredEntry;
  write(entry: TRawEntry, replace: boolean): void;
  go(delta: number): void;
  /** Calls `listener` after every move (made by `go` or by the player). */
  onMove(listener: () => void): void;
};

/** How a part reads and writes an entry — picked once per primitive, not by the part's name at every call. */
type TPartRule = {
  /** The part's own string in an entry. */
  read(entry: TRawEntry): string;
  /** The address of an entry with this part set to `href`: the outer parts kept, the inner ones cleared. */
  place(current: TRawEntry, href: string): [url: string, hash: string, state: string];
  /** What the address bar shows for `href` in this part. */
  show(href: string, current: TRawEntry): string;
};

/** The address an entry shows: `url#hash`. */
const addressOf = (entry: TStoredEntry): string => (entry.hash ? entry.url + '#' + entry.hash : entry.url);

const RULES: Record<THistoryPart, TPartRule> = {
  [URL_PART]: {
    read: (entry) => entry.url,
    place: (_, href) => [
      href,
      '',
      ROOT_PATH,
    ],
    show: (href) => href,
  },
  [HASH_PART]: {
    read: (entry) => entry.hash,
    place: (current, href) => [
      current.url,
      href,
      ROOT_PATH,
    ],
    show: (href) => '#' + href,
  },
  [STATE_PART]: {
    read: (entry) => entry.state.state,
    place: (current, href) => [
      current.url,
      current.hash,
      href,
    ],
    show: (_, current) => addressOf(current),
  },
};

function isOurs(value: unknown): value is TEntryState {
  return isObject(value) && (value as TEntryState).fundamentool === ENTRY_FORMAT;
}

/** The primitives over a timeline: one per part, in step. */
function createPrimitives(driver: TTimelineDriver): THistoryPrimitives {
  const listeners = {} as Record<THistoryPart, Set<(entry: THistoryEntry) => void>>;
  for (const part of PARTS) {
    listeners[part] = new Set();
  }
  /** Moves made by the code: the next move is theirs, not the player's. */
  const waiters: (() => void)[] = [];
  /** Revisions unique across reloads: this run's start, then a counter. */
  const session = Date.now().toString(36);
  let revisions = 0;

  /**
   * The entry as ours. An entry without our mark is a first visit (`from` is `null`) or one the browser made after the
   * entry we left (an address typed or a plain `#anchor` followed): it takes the next place, keeps the outer parts the
   * move didn't change, and gets our mark — unless another script keeps its own state there (read, not overwritten).
   */
  function adopt(stored: TStoredEntry, from: TRawEntry | null): TRawEntry {
    const state = stored.state;
    if (isOurs(state)) {
      return stored as TRawEntry;
    }
    const entry: TRawEntry = {
      url: stored.url,
      hash: stored.hash,
      state: {
        fundamentool: ENTRY_FORMAT,
        index: from ? from.state.index + 1 : 0,
        state: ROOT_PATH,
        data: {},
        rev: {},
      },
    };
    if (from && from.url === entry.url) {
      entry.state.data[URL_PART] = from.state.data[URL_PART];
      entry.state.rev[URL_PART] = from.state.rev[URL_PART];
    }
    if (state === null || state === undefined) {
      driver.write(entry, true);
    }
    return entry;
  }

  let current = adopt(driver.read(), null);
  /** The last place known to exist ahead: a move past it (or before the first) isn't made. */
  let last = current.state.index;

  function travel(delta: number): Promise<void> {
    return new Promise((done) => {
      waiters.push(done);
      driver.go(delta);
    });
  }

  function canGo(delta: number): boolean {
    const to = current.state.index + delta;
    return to >= 0 && to <= last;
  }

  driver.onMove(() => {
    const waiter = waiters.shift();
    const from = current;
    const stored = driver.read();
    current = adopt(stored, from);
    // An entry new to us was made by the browser after the one we left: what was ahead is gone.
    last = isOurs(stored.state) ? Math.max(last, current.state.index) : current.state.index;
    if (waiter) {
      waiter();
      return;
    }
    const target = from.state.index - 1;
    // The player's Back jumped over entries (Chrome skips entries made without a gesture): one entry back instead.
    if (current.state.index < target) {
      void travel(target - current.state.index).then(() => notify(from));
      return;
    }
    notify(from);
  });

  /** Tells each part whose address or data changed with the player's move. */
  function notify(from: TRawEntry): void {
    for (const part of PARTS) {
      const rule = RULES[part];
      if (rule.read(from) !== rule.read(current) || from.state.rev[part] !== current.state.rev[part]) {
        const entry = view(current, part);
        listeners[part].forEach((listener) => listener(entry));
      }
    }
  }

  function view(entry: TRawEntry, part: THistoryPart): THistoryEntry {
    return {
      location: urlParse(RULES[part].read(entry) || ROOT_PATH),
      data: entry.state.data[part],
    };
  }

  function primitive(part: THistoryPart): THistoryPrimitive {
    const rule = RULES[part];
    const outer = PARTS.slice(0, PARTS.indexOf(part));
    const partListeners = listeners[part];

    /** The entry this part writes at `index`: the outer parts kept, the inner ones cleared (nested scopes, D-039). */
    function next(
      location: TUrlProps, data: unknown, index: number,
    ): TRawEntry {
      const [
        url,
        hash,
        state,
      ] = rule.place(current, location.href || ROOT_PATH);
      const known = current.state;
      const entryData: TEntryState['data'] = {};
      const rev: TEntryState['rev'] = {};
      for (const outerPart of outer) {
        entryData[outerPart] = known.data[outerPart];
        rev[outerPart] = known.rev[outerPart];
      }
      entryData[part] = data;
      rev[part] = session + '.' + ++revisions;
      return {
        url,
        hash,
        state: {
          fundamentool: ENTRY_FORMAT,
          index,
          state,
          data: entryData,
          rev,
        },
      };
    }

    return {
      current: () => view(current, part),
      push(location, data) {
        const entry = next(
          location, data, current.state.index + 1,
        );
        driver.write(entry, false);
        current = entry;
        last = entry.state.index;
      },
      replace(location, data) {
        const entry = next(
          location, data, current.state.index,
        );
        driver.write(entry, true);
        current = entry;
      },
      canGo,
      async go(delta) {
        if (delta && canGo(delta)) {
          await travel(delta);
        }
        return view(current, part);
      },
      href: (location) => rule.show(location.href || ROOT_PATH, current),
      watch(listener) {
        partListeners.add(listener);
        return () => {
          partListeners.delete(listener);
        };
      },
    };
  }

  return {
    [URL_PART]: primitive(URL_PART),
    [HASH_PART]: primitive(HASH_PART),
    [STATE_PART]: primitive(STATE_PART),
  };
}

/** One set of primitives per window: two providers on one history would fight over it. */
const byWindow = new WeakMap<Window, THistoryPrimitives>();

/**
 * The browser history as three primitives — the address, its hash part, the entry's own state — in step on one
 * timeline (fundamentool D-039). The same primitives for the same window.
 *
 * @example
 * const history = browserHistoryPrimitivesProvider(window);
 * const router = createRouter({ historyPrimitive: history.hash, createObservable, createApi });
 */
export function browserHistoryPrimitivesProvider(win: Window): THistoryPrimitives {
  const existing = byWindow.get(win);
  if (existing) {
    return existing;
  }
  const history = win.history;
  const location = win.location;
  // Native methods need `this === history`; taken once (D-035).
  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  const historyGo = history.go.bind(history);
  const primitives = createPrimitives({
    read: () => ({
      url: location.pathname + location.search,
      hash: location.hash.slice(1),
      state: history.state,
    }),
    write(entry, replace) {
      (replace ? replaceState : pushState)(
        entry.state, '', addressOf(entry),
      );
    },
    go: historyGo,
    onMove(listener) {
      attachEvent(
        win, 'popstate', listener,
      );
    },
  });
  byWindow.set(win, primitives);
  return primitives;
}

/**
 * The same three primitives over an array — a navigation outside the browser's history (a widget, a preview, tests).
 * `navigate(delta)` is a move by the player (Back / Forward); `entries()` — the addresses, `index()` — where it is.
 *
 * @example
 * const history = memoryHistoryPrimitivesProvider('/level/1');
 * const router = createRouter({ historyPrimitive: history.url, createObservable, createApi });
 * history.navigate(-1); // the player's Back
 */
export function memoryHistoryPrimitivesProvider(start = ROOT_PATH): TMemoryHistoryPrimitives {
  const [
    url,
    hash = '',
  ] = start.split('#');
  const entries: TStoredEntry[] = [
    {
      url: url || ROOT_PATH,
      hash,
      state: null,
    },
  ];
  let index = 0;
  /** Set by the primitives as they are made, before any move. */
  let onMove: () => void;
  const move = (delta: number) => {
    index = Math.min(Math.max(index + delta, 0), entries.length - 1);
    // Asynchronous, as the browser's move is; reported even when it changed nothing, so a waiting `go` settles.
    void Promise.resolve().then(onMove);
  };
  const primitives = createPrimitives({
    read: () => entries[index],
    write(entry, replace) {
      if (replace) {
        entries[index] = entry;
      } else {
        entries.splice(
          ++index, entries.length, entry,
        );
      }
    },
    go: move,
    onMove(listener) {
      onMove = listener;
    },
  });
  return {
    ...primitives,
    navigate: move,
    entries: () => entries.map(addressOf),
    index: () => index,
  };
}
