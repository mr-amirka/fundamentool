// fundamentool/sql — a query as data, dialects as presets, drivers by shape (fundamentool D-088, lab D-042): builders
// of plain nodes, `matchWhere` (a `match` pattern as a condition, its meaning kept), a compiler whose node kinds are
// `fundamentool/hooks` chains, the `sqlite` dialect, and `sqliteAdapter` over better-sqlite3 or `node:sqlite`.
export * from './types';
export {
  alias,
  and,
  asc,
  col,
  deleteFrom,
  desc,
  eq,
  fn,
  gt,
  gte,
  inList,
  insertInto,
  isNull,
  isSqlNode,
  join,
  jsonGet,
  leftJoin,
  like,
  lt,
  lte,
  ne,
  not,
  or,
  param,
  raw,
  selectFrom,
  table,
  update,
  valueNode,
} from './nodes';
export {
  matchWhere,
} from './match';
export {
  sqlCompiler,
  sqlDialect,
} from './compiler';
export {
  fts5Query,
  jsonPath,
  sqlite,
  sqliteFts5,
  textMatch,
} from './sqlite';
export {
  sqliteAdapter,
  sqliteErrorCode,
} from './adapter';
