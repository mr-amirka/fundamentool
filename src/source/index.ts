// fundamentool/source — strings from source code without running it (fundamentool D-097, lab D-052): comments blanked
// with the length kept, the strings an expression can be, the strings at places by name — by text and by TypeScript's
// parser (given as an argument, never imported) — the parts of a single-file component, edits by positions.
export * from './types';
export {
  applyEdits,
} from './applyEdits';
export {
  blankComments,
  blankSpan,
} from './blankComments';
export {
  expressionStrings,
} from './expressionStrings';
export {
  matchesName,
  namePatternSource,
} from './names';
export {
  sfcParts,
} from './sfcParts';
export {
  STRING_PLACES,
  sourceStringsProvider,
} from './sourceStringsProvider';
export {
  parseSource,
  syntaxStringsProvider,
  syntaxValueRanges,
} from './syntax';
export type {
  TSyntaxStrings,
  TTypeScript,
} from './syntax';
