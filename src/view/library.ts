// A React-like view library — what fundamentool's view code is built on, injected (fundamentool D-048): React,
// Preact (`preact/compat`), later fundamentool's own. One type for every module that renders or uses hooks.
import {
  describeValue,
} from '../describeValue';
import {
  isFunction,
} from '../is/isFunction';

/** The view library's members fundamentool uses — the app passes the library's own (`React.createElement`, …). */
export type TViewLibrary = {
  createElement: (...args: any[]) => any;
  forwardRef: (...args: any[]) => any;
  /** The library's way to read an outside store (React 18+, Preact `compat`): no update missed, no torn read. */
  useSyncExternalStore: <T>(subscribe: (onChange: () => void) => () => void, getSnapshot: () => T) => T;
  useEffect: (...args: any[]) => void;
  useState: (...args: any[]) => any;
  useRef: (...args: any[]) => any;
  createContext: (...args: any[]) => any;
  useContext: (...args: any[]) => any;
};

/** The single list of a view library's keys. */
export const VIEW_LIBRARY_KEYS = [
  'createElement',
  'forwardRef',
  'useSyncExternalStore',
  'useEffect',
  'useState',
  'useRef',
  'createContext',
  'useContext',
] as const;

/**
 * Checks that the members `needed` of a view library are functions (cold path — on creation). The library may carry
 * the rest of its members too: a provider takes the whole library and uses what it needs.
 *
 * @example
 * assertViewLibrary('[fundamentool] viewHooksProvider', deps, ['useSyncExternalStore', 'useRef']);
 */
export function assertViewLibrary(
  where: string, library: Partial<TViewLibrary>, needed: readonly (keyof TViewLibrary)[],
): void {
  for (const key of needed) {
    if (!isFunction(library[key])) {
      throw new TypeError(`${where}: "${key}" expects the view library's function (React's, Preact's), got ${describeValue(library[key])}`);
    }
  }
}
