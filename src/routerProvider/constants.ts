// The router's constants: entry kinds, section modes, option key lists, layer styles.
import type {
  TParams,
} from '../unparam';
import type {
  TOutcome,
} from './internalTypes';

/** The kinds of the stack's entries (`TEntry['kind']`). */
export const PAGE = 'page';
export const WINDOW = 'window';

/** The section-history modes (`sectionHistory`). */
export const SHARED = 'shared';
export const SEPARATE = 'separate';

/** The phases the opened-entry effects run in (`runOpened`). */
export const CLOSE = 'close';
export const REOPEN = 'reopen';

/** An empty query, shared (never mutated). */
export const NOOP_OBJECT: TParams = {};

/** The `…Throttled` steps: calls within 300 ms of an accepted one (or while it runs) are ignored — a double tap. */
export const THROTTLE = {
  minMs: 300,
};

/**
 * The default lock watcher options.
 *
 * @type {Object}
 * @property {boolean} forwards - Whether to watch forwards.
 * @property {boolean} backwards - Whether to watch backwards.
 */
export const DEFAULT_LOCK_WATCHER_OPTIONS = {
  forwards: false,
  backwards: true,
};

/** The single list of accepted keys of `TOpenOptions`. */
export const OPEN_OPTION_KEYS = ['reopen'] as const;

/** The single list of accepted keys of `TLeavePageOptions`. */
export const LEAVE_PAGE_OPTION_KEYS = ['fallback'] as const;

/** The single list of accepted keys of `TNavigationHostOptions`. */
export const NAVIGATION_HOST_OPTION_KEYS = ['renderPage', 'renderWindow'] as const;

/** What `router.NavigationHostProvider` needs from the view library. */
export const NAVIGATION_HOST_DEPS = [
  'createElement',
  'useEffect',
  'useState',
  'useRef',
  'createContext',
  'useContext',
] as const;

/** The single list of accepted keys of the router's dependencies — checked against the type in tests. */
export const ROUTER_DEPS_KEYS = [
  ...NAVIGATION_HOST_DEPS,
  'window',
  'Component',
  'forwardRef',
  'createObservable',
  'createApi',
  'describe',
  'sections',
  'sectionHistory',
  'keep',
  'exitMs',
] as const;

export const ROUTER_WHERE = '[fundamentool] routerProvider';

/** How a step back ended: the entries were left. */
export const LEFT: TOutcome = {
  left: Promise.resolve(true),
};

/** How a step back ended: a guard kept the entries (or there was nothing to leave). */
export const STAYED: TOutcome = {
  left: Promise.resolve(false),
};

/** A page layer: its own scroll container (keeps its scroll under `display: none` — research 02 §6.1). */
export const LAYER = {
  position: 'absolute',
  inset: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
};
