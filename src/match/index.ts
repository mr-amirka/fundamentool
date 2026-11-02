// fundamentool/match — a filter as data (fundamentool D-086, lab D-042): a pattern compiled once into a predicate
// (`matchProvider`), the same pattern as a tree for SQL and planners (`normalizeMatch`), operators as a registry a
// project extends (`STANDARD_OPERATORS`).
export * from './types';
export {
  MATCH_TYPES,
  STANDARD_OPERATORS,
  matchTypeOf,
  type TMatchType,
} from './operators';
export {
  normalizeMatch,
} from './normalizeMatch';
export {
  matchProvider,
  type TMatchPredicate,
} from './matchProvider';
export {
  isMatch,
} from '../is/isMatch';
