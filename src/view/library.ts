// A React-like view library — what fundamentool's view code is built on, injected (fundamentool D-048): React,
// Preact (`preact/compat`), later fundamentool's own. One type for every module that renders or uses hooks.
import {
  func,
} from '../schema';
import type {
  TSchema,
} from '../schema';

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
 * The view library's members as a schema shape (`fundamentool/schema`, D-051): `needed` must be the library's
 * functions, the rest may come along. Spread into an entry point's options schema.
 *
 * @example
 * object({ router: ROUTER(), ...viewLibraryShape(['createElement', 'useRef']) }).passthrough().parse(deps, WHERE);
 * // TypeError: …: "useRef" expects the view library's function (React's, Preact's), got undefined
 */
export function viewLibraryShape(needed: readonly (keyof TViewLibrary)[]): Record<keyof TViewLibrary, TSchema<unknown>> {
  const shape = {} as Record<keyof TViewLibrary, TSchema<unknown>>;
  for (const key of VIEW_LIBRARY_KEYS) {
    const member = func().describe("the view library's function (React's, Preact's)");
    shape[key] = needed.includes(key) ? member : member.optional();
  }
  return shape;
}
