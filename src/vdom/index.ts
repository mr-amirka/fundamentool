// fundamentool's view library (fundamentool D-072): React's API — elements, components, hooks, contexts, portals,
// `createRoot` — on a reconciler of its own, a few kilobytes. One entry for what React spreads over `react`,
// `react-dom`, `react-dom/client` and `react/jsx-runtime`: an app's bundler points all four here.
export {
  Children,
  cloneElement,
  createContext,
  createElement,
  createPortal,
  forwardRef,
  Fragment,
  isValidElement,
  jsx,
  jsxDEV,
  jsxs,
  memo,
  StrictMode,
  version,
} from './element';
export type {
  TContext,
  TElement,
  TElementType,
  TNode,
  TPortal,
  TRef,
} from './element';
export {
  act,
  createRoot,
  useContext,
} from './reconciler';
export type {
  TRoot,
} from './reconciler';
export {
  useCallback,
  useDebugValue,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from './hooks';
export type {
  TEffect,
  TSetStateAction,
} from './hooks';
