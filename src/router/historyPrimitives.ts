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
import type {
  THistoryEntry,
  THistoryPart,
  THistoryPrimitive,
  THistoryPrimitives,
  TMemoryHistoryPrimitives,
} from './types';

/** The parts, outer first: a step in one clears the ones after it. */
const PARTS: readonly THistoryPart[] = [
  'url',
  'hash',
  'state',
];

/** What a timeline keeps in an entry besides its address: our mark, the entry's place, each part's data. */
type TEntryState = {
  fundamentool: 1;
  index: number;
  /** The `state` part's location. */
  state: string;
  data: Partial<Record<THistoryPart, unknown>>;
};

/** An entry as the timeline holds it: the address's two parts and the state. */
type TRawEntry = {
  url: string;
  hash: string;
  state: TEntryState;
};

/** How a timeline is stored: the browser's history or an array. */
type TTimelineDriver = {
  read(): {
    url: string;
    hash: string;
    state: unknown;
  };
  write(entry: TRawEntry, replace: boolean): void;
  go(delta: number): void;
  /** Calls `listener` after every move (made by `go` or by the player). */
  onMove(listener: () => void): void;
};

function isOurs(value: unknown): value is TEntryState {
  return isObject(value) && (value as TEntryState).fundamentool === 1;
}

/** A part's own string in an entry. */
function partHref(entry: TRawEntry, part: THistoryPart): string {
  return part === 'url' ? entry.url : part === 'hash' ? entry.hash : entry.state.state;
}

/** Whether a part reads the same in two entries — its address and its data. */
function samePart(
  a: TRawEntry, b: TRawEntry, part: THistoryPart,
): boolean {
  return partHref(a, part) === partHref(b, part)
    && JSON.stringify(a.state.data[part]) === JSON.stringify(b.state.data[part]);
}

/** The primitives over a timeline: one per part, in step. */
function createPrimitives(driver: TTimelineDriver): THistoryPrimitives {
  const listeners: Record<THistoryPart, Set<(entry: THistoryEntry) => void>> = {
    url: new Set(),
    hash: new Set(),
    state: new Set(),
  };
  /** Moves made by the code: the next move is theirs, not the player's. */
  const waiters: (() => void)[] = [];

  function read(): TRawEntry {
    const {
      url,
      hash,
      state,
    } = driver.read();
    return {
      url,
      hash,
      state: isOurs(state) ? state : {
        fundamentool: 1,
        index: 0,
        state: '/',
        data: {},
      },
    };
  }

  let current = read();
  // A first visit: the entry gets our mark, so a reload (or a return from another site) finds its place.
  if (!isOurs(driver.read().state)) {
    driver.write(current, true);
  }

  function view(entry: TRawEntry, part: THistoryPart): THistoryEntry {
    return {
      location: urlParse(partHref(entry, part) || '/'),
      data: entry.state.data[part],
    };
  }

  /** The entry `part` writes: the outer parts kept, the inner ones cleared (nested scopes, D-039). */
  function next(
    part: THistoryPart, location: TUrlProps, data: unknown, index: number,
  ): TRawEntry {
    const keep = PARTS.indexOf(part);
    const entryData: Partial<Record<THistoryPart, unknown>> = {};
    for (let i = 0; i < keep; i++) {
      entryData[PARTS[i]] = current.state.data[PARTS[i]];
    }
    entryData[part] = data;
    const href = location.href || '/';
    const isUrl = part === 'url';
    return {
      url: isUrl ? href : current.url,
      hash: part === 'hash' ? href : isUrl ? '' : current.hash,
      state: {
        fundamentool: 1,
        index,
        state: part === 'state' ? href : '/',
        data: entryData,
      },
    };
  }

  function travel(delta: number): Promise<void> {
    return new Promise((done) => {
      waiters.push(done);
      driver.go(delta);
    });
  }

  driver.onMove(() => {
    const waiter = waiters.shift();
    const from = current;
    current = read();
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
      if (!samePart(
        from, current, part,
      )) {
        const entry = view(current, part);
        listeners[part].forEach((listener) => listener(entry));
      }
    }
  }

  function primitive(part: THistoryPart): THistoryPrimitive {
    return {
      current: () => view(current, part),
      push(location, data) {
        const entry = next(
          part, location, data, current.state.index + 1,
        );
        driver.write(entry, false);
        current = entry;
      },
      replace(location, data) {
        const entry = next(
          part, location, data, current.state.index,
        );
        driver.write(entry, true);
        current = entry;
      },
      async go(delta) {
        if (delta) {
          await travel(delta);
        }
        return view(current, part);
      },
      href: (location) => (part === 'url' ? location.href || '/' : part === 'hash' ? '#' + (location.href || '/')
        : current.url + (current.hash ? '#' + current.hash : '')),
      watch(listener) {
        listeners[part].add(listener);
        return () => {
          listeners[part].delete(listener);
        };
      },
    };
  }

  return {
    url: primitive('url'),
    hash: primitive('hash'),
    state: primitive('state'),
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
      const href = entry.url + (entry.hash ? '#' + entry.hash : '');
      (replace ? replaceState : pushState)(
        entry.state, '', href,
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
export function memoryHistoryPrimitivesProvider(start = '/'): TMemoryHistoryPrimitives {
  const [
    url,
    hash = '',
  ] = start.split('#');
  const entries: TRawEntry[] = [
    {
      url: url || '/',
      hash,
      state: null as unknown as TEntryState,
    },
  ];
  let index = 0;
  let onMove: () => void = () => undefined;
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
    entries: () => entries.map((entry) => entry.url + (entry.hash ? '#' + entry.hash : '')),
    index: () => index,
  };
}
