/**
 * Port: the browser history as the navigation core needs it (fundamentool D-011: injected, hash by default, swapped in
 * one line). The core only pushes / replaces entries with its own state and travels by a delta; the address shows the
 * page's path, never the window stack (it lives in `history.state`).
 */
export type THistoryPort = {
  /** The state of the current browser entry — ours or anybody's. */
  state: () => unknown;
  /** The path the address bar shows now (`/notes/3`). */
  path: () => string;
  push: (state: unknown, path: string) => void;
  replace: (state: unknown, path: string) => void;
  /** Like `history.go(delta)`: the result arrives later as a `listen` call. */
  go: (delta: number) => void;
  /** Back / forward by the browser or `go`; returns the unsubscribe. */
  listen: (listener: (state: unknown) => void) => () => void;
};

/** How the path is kept in the address. */
export type THistoryMode = 'hash' | 'path';

/**
 * The browser history behind the port.
 *
 * @param win - the window (injected — tests and iframes pass their own).
 * @param mode - `hash` (default: works in iframes and on static hosting — FB Instant, Telegram, VK) or `path`.
 *
 * @example
 * const nav = createNavigation({ history: createBrowserHistory(window), … });          // #/notes/3
 * const nav = createNavigation({ history: createBrowserHistory(window, 'path'), … });  // /notes/3
 */
export function createBrowserHistory(win: Window, mode: THistoryMode = 'hash'): THistoryPort {
  if (mode !== 'hash' && mode !== 'path') {
    throw new TypeError(`[fundamentool] createBrowserHistory: mode expects "hash" or "path", got ${String(mode)}`);
  }
  const url = (path: string): string => (mode === 'hash' ? `#${path}` : path);
  return {
    state: () => win.history.state as unknown,
    path: () => (mode === 'hash' ? win.location.hash.replace(/^#/, '') : win.location.pathname) || '/',
    push: (state, path) => win.history.pushState(
      state, '', url(path),
    ),
    replace: (state, path) => win.history.replaceState(
      state, '', url(path),
    ),
    go: (delta) => win.history.go(delta),
    listen: (listener) => {
      const onPop = (event: PopStateEvent): void => listener(event.state as unknown);
      win.addEventListener('popstate', onPop);
      return () => win.removeEventListener('popstate', onPop);
    },
  };
}
