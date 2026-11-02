// fundamentool/async/hooks — the hooks whose handlers may wait (fundamentool D-091, lab D-050): `fundamentool/hooks`'
// four kinds by the same names, and `parallelHook`; a handler may return a value or a promise, alike. The tools that
// don't depend on the mode — hooks by key, a host's hooks by name, the order of presets — are `fundamentool/hooks`'
// own, re-exported, so an async host imports one module. Not re-exported by `fundamentool/async`: its names are the
// sync module's.
export * from './types';
export type {
  THandlerOf,
  THook,
  THookAddOptions,
  THookMap,
  THookOptions,
  THookOrder,
  TNamedHooks,
  TOrderPresetsOptions,
  TPreset,
  TPresetObject,
  TRemoval,
} from '../../hooks/types';
export {
  bailHook,
  chainHook,
  eachHook,
  hookError,
  parallelHook,
  waterfallHook,
} from './hooks';
export {
  hookMap,
  namedHooks,
} from '../../hooks/hookMap';
export {
  orderPresets,
  presetSetup,
} from '../../hooks/orderPresets';
