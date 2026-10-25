// fundamentool's view bindings (D-048, D-049): the hooks that read stores in components, links for any router, the
// locale's bindings (`localeViewProvider`, D-061), the loader of parts in files of their own (`dynamicLoaderProvider`) —
// over a React-like view library the app passes in (React, Preact `compat`; later fundamentool's own).
export {
  VIEW_LIBRARY_KEYS,
  viewLibraryShape,
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
export {
  localeViewProvider,
} from './localeViewProvider';
export type {
  TLocaleViewDeps,
  TTagRenderers,
  TTextProps,
} from './localeViewProvider';
export {
  dynamicLoaderProvider,
} from './dynamicLoaderProvider';
export type {
  TDynamicFailure,
  TDynamicLoader,
  TDynamicLoaderDeps,
  TDynamicLoaderOptions,
  TDynamicModule,
  TDynamicState,
  TDynamicStatus,
} from './dynamicLoaderProvider';
