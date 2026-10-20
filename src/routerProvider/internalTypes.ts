// The router's own types — shared by its parts, not part of its public API.
import type {
  Observable,
} from '../Observable/types';
import type {
  TUrlProps,
} from '../urlParse';
import type {
  TEntry,
  TForwardHandler,
  TLeaveGuard,
  TRouterState,
} from './types';

/** A component of the injected view library. */
export type TElementType = any;

/** Props of an anchor element. */
export type TAnchorProps = Record<string, any>;

/** A click event, as much as `Link` uses. */
export type TClickEvent = { preventDefault?: () => void } & Record<string, any>;

/** An effect with an optional cleanup (`useEffect`'s shape). */
export type TEffectCallback = () => void | (() => void | undefined);

/** A hook's dependency list. */
export type TDependencyList = ReadonlyArray<unknown>;

/** What the router writes into `history.state`: whose entry it is, how deep, which entry (Forward checks it). */
export type TOurState = {
  nav: string;
  depth: number;
  id: number;
};

/** How a step back ended: `left` settles `true` when the entries were left, `false` when a guard kept them. */
export type TOutcome = {
  left: Promise<boolean>;
};

/** An effect registered with `whileOpen`, and the cleanup it returned last. */
export type TOpenedEffect = {
  effect: () => void | (() => void);
  cleanup: (() => void) | void;
};

/** A forward handler and whether windows trigger it too. */
export type TForwardItem = {
  handler: TForwardHandler;
  windows: boolean;
};

/** What the hooks and the view need from the router's stack. */
export type TRouterCore = {
  /** The router's state. */
  $state: Observable<TRouterState>;
  /** The entries now, bottom to top. */
  entries: () => readonly TEntry[];
  /** The location a page renders with: the hash part for the hash router. */
  own: (location: TUrlProps) => TUrlProps;
  close: (entryId: number, result?: unknown) => Promise<void>;
  whileOpen: (entryId: number, effect: () => void | (() => void)) => () => void;
  onForward: (entryId: number, handler: TForwardHandler, options?: { windows?: boolean }) => () => void;
  onBeforeLeave: (entryId: number, guard: TLeaveGuard) => () => void;
};
