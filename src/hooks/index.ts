// fundamentool/hooks — named moments a host lets presets act at (fundamentool D-087, lab D-042): four kinds of sync
// hook, hooks by key (`hookMap`), a host's hooks by name (`namedHooks`), and the order of presets by what they require
// (`orderPresets`). Handlers that may wait: `fundamentool/async/hooks`, the same kinds by the same names (D-091).
export * from './types';
export {
  bailHook,
  chainHook,
  eachHook,
  hookError,
  waterfallHook,
} from './hooks';
export {
  hookMap,
  namedHooks,
} from './hookMap';
export {
  orderPresets,
  presetSetup,
} from './orderPresets';
