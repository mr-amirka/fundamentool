// fundamentool's view bindings (D-048, D-049): the hooks that read stores in components, links for any router —
// over a React-like view library the app passes in (React, Preact `compat`; later fundamentool's own).
export {
  assertViewLibrary,
  VIEW_LIBRARY_KEYS,
} from './library';
export type {
  TViewLibrary,
} from './library';
export {
  viewHooksProvider,
} from './viewHooksProvider';
export type {
  TStoreMapConfig,
  TUnitValues,
} from './viewHooksProvider';
export {
  linksProvider,
} from './linksProvider';
export type {
  TLinkProps,
  TLinksDeps,
} from './linksProvider';
