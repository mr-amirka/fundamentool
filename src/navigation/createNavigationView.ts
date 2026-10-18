import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import type {
  TEntry,
  TForwardHandler,
  TLeaveGuard,
  TNavigation,
  TNavigationState,
  TPageEntry,
  TWindowEntry,
} from './createNavigation';

/**
 * The view library, injected whole (fundamentool D-013): React and `preact/compat` both fit, our own could. Only what
 * the host and the hooks use.
 */
export type TViewKit = {
  createElement: (type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]) => unknown;
  createContext: <T>(value: T) => { Provider: unknown };
  useContext: <T>(context: { Provider: unknown }) => T;
  useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
  useRef: <T>(value: T) => { current: T };
  useState: <T>(value: T | (() => T)) => [T, (value: T) => void];
};

/** What a window renders with: its params, whether it is open (false while it plays its exit), how to close it. */
export type TWindowProps<P = unknown, R = unknown> = {
  params: P;
  open: boolean;
  close: (result?: R) => void;
};

/** Options of {@link createNavigationView}. */
export type TNavigationViewOptions = {
  /** The page for a path. */
  renderPage: (entry: TPageEntry) => unknown;
  /** A window entry → its element (the app decides what `entry.window` is — usually a component). */
  renderWindow: (entry: TWindowEntry, props: TWindowProps) => unknown;
};

/** The host and the hooks over one navigation core. */
export type TNavigationView = {
  /** Renders the page layers (each its own scroll container; hidden ones `display: none`) and the windows. */
  NavigationHost: () => unknown;
  /** The navigation core. */
  useNavigation: () => TNavigation;
  /** The navigation state, re-rendering on change. */
  useNavigationState: () => TNavigationState;
  /** The entry this component is rendered in. */
  useEntry: () => TEntry;
  /** `effect` while the entry is open: cleanup when it starts closing, again if closing is refused (D-015). */
  useWhileOpen: (effect: () => void | (() => void)) => void;
  /** `handler` when a page (with `{ windows: true }` — also a window) opens over this entry (D-015). */
  useOnForward: (handler: TForwardHandler, options?: { windows?: boolean }) => void;
  /** `guard` before this entry is left by going back — e.g. "discard changes?". */
  useBeforeLeave: (guard: TLeaveGuard) => void;
};

/** The single list of accepted option keys of {@link createNavigationView}. */
export const NAVIGATION_VIEW_OPTION_KEYS = ['renderPage', 'renderWindow'] as const;

const WHERE = '[fundamentool] createNavigationView';

/** A page layer: its own scroll container (keeps its scroll under `display: none` — research 02 §6.1). */
const LAYER = {
  position: 'absolute',
  inset: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain', 
};

/**
 * The view of the navigation core, built from an injected view library (fundamentool D-013).
 *
 * @example
 * const view = createNavigationView(React, nav, {
 *   renderPage: (entry) => <Page path={entry.path} />,
 *   renderWindow: (entry, props) => <entry.window {...props} />,
 * });
 * root.render(<view.NavigationHost />);
 */
export function createNavigationView(
  kit: TViewKit, nav: TNavigation, options: TNavigationViewOptions,
): TNavigationView {
  const hooks = [
    'createElement',
    'createContext',
    'useContext',
    'useEffect',
    'useRef',
    'useState',
  ];
  if (typeof kit !== 'object' || kit === null || !hooks.every((name) => typeof (kit as Record<string, unknown>)[name] === 'function')) {
    throw new TypeError(`${WHERE}: the view kit expects { ${hooks.join(', ')} } (React, preact + preact/hooks…), got ${describeValue(kit)}`);
  }
  if (typeof nav !== 'object' || nav === null || typeof nav.subscribe !== 'function' || typeof nav.getState !== 'function') {
    throw new TypeError(`${WHERE}: expects a navigation from createNavigation, got ${describeValue(nav)}`);
  }
  if (typeof options !== 'object' || options === null) {
    throw new TypeError(`${WHERE}: expects an options object, got ${describeValue(options)}`);
  }
  assertKnownOptions(
    WHERE, options, NAVIGATION_VIEW_OPTION_KEYS,
  );
  for (const key of NAVIGATION_VIEW_OPTION_KEYS) {
    if (typeof options[key] !== 'function') {
      throw new TypeError(`${WHERE}: option "${key}" expects a function, got ${describeValue(options[key])}`);
    }
  }
  const h = kit.createElement;
  const EntryContext = kit.createContext<TEntry | null>(null);

  function useNavigationState(): TNavigationState {
    const [state, setState] = kit.useState(nav.getState);
    kit.useEffect(() => nav.subscribe(setState), []);
    return state;
  }

  function useEntry(): TEntry {
    const entry = kit.useContext<TEntry | null>(EntryContext);
    if (!entry) {
      throw new Error('navigation: a navigation hook is used outside a page or a window');
    }
    return entry;
  }

  /** Keeps the latest callback in a ref, so a registration made once calls what the component rendered last. */
  function useLatest<T>(value: T): { current: T } {
    const ref = kit.useRef(value);
    ref.current = value;
    return ref;
  }

  function withEntry(entry: TEntry, child: unknown): unknown {
    return h(
      EntryContext.Provider, {
        value: entry,
        key: entry.id, 
      }, child,
    );
  }

  function NavigationHost(): unknown {
    const state = useNavigationState();
    // Layers of every section's stack, in a stable order: a layer that moved in the DOM would lose its scroll.
    const layers = state.layers
      .map((entry) => h(
        'div', {
          key: entry.id,
          'data-nav-layer': entry.depth,
          'aria-hidden': entry === state.page ? undefined : 'true',
          style: {
            ...LAYER,
            display: entry === state.page ? 'block' : 'none', 
          },
        }, withEntry(entry, options.renderPage(entry)),
      ));
    const open = state.entries.filter((entry): entry is TWindowEntry => entry.kind === 'window');
    const windows = [...open, ...state.leaving].map((entry) => withEntry(entry, options.renderWindow(entry, {
      params: entry.params,
      open: open.includes(entry),
      close: (result?: unknown) => {
        void nav.close(entry.id, result);
      },
    })));
    return h(
      'div', {
        'data-nav-host': '',
        style: {
          position: 'absolute',
          inset: 0, 
        }, 
      }, ...layers, ...windows,
    );
  }

  return {
    NavigationHost,
    useNavigation: () => nav,
    useNavigationState,
    useEntry,
    useWhileOpen: (effect) => {
      const entry = useEntry();
      const latest = useLatest(effect);
      kit.useEffect(() => nav.whileOpen(entry.id, () => latest.current()), []);
    },
    useOnForward: (handler, handlerOptions) => {
      const entry = useEntry();
      const latest = useLatest(handler);
      const windows = Boolean(handlerOptions?.windows);
      kit.useEffect(() => nav.onForward(
        entry.id, () => latest.current(), {
          windows, 
        },
      ), [windows]);
    },
    useBeforeLeave: (guard) => {
      const entry = useEntry();
      const latest = useLatest(guard);
      kit.useEffect(() => nav.onBeforeLeave(entry.id, () => latest.current()), []);
    },
  };
}
