import {
  array,
  boolean,
  func,
  lazy,
  literal,
  object,
  record,
  string,
  union,
  unknown,
} from '../schema';

/** The prefix of the module's messages. */
export const WHERE = '[fundamentool/sql]';

const NAMES = () => array(string());

const SELECT_OPTIONS = /*#__PURE__*/ lazy(() => object({
  distinct: boolean().optional(),
  columns: array(unknown()).optional(),
  where: unknown().optional(),
  groupBy: array(unknown()).optional(),
  having: unknown().optional(),
  orderBy: array(unknown()).optional(),
  limit: unknown().optional(),
  offset: unknown().optional(),
}));

const INSERT_OPTIONS = /*#__PURE__*/ lazy(() => object({
  values: union([
    record(unknown()),
    array(record(unknown())),
  ]),
  onConflict: object({
    target: NAMES(),
    update: NAMES().optional(),
    nothing: literal(true).optional(),
  }).optional(),
  returning: NAMES().optional(),
}));

const UPDATE_OPTIONS = /*#__PURE__*/ lazy(() => object({
  set: record(unknown()),
  where: unknown().optional(),
  returning: NAMES().optional(),
}));

const DELETE_OPTIONS = /*#__PURE__*/ lazy(() => object({
  where: unknown().optional(),
  returning: NAMES().optional(),
}));

const COMPILER_OPTIONS = /*#__PURE__*/ lazy(() => object({
  presets: array(unknown()).optional(),
}));

const DIALECT = /*#__PURE__*/ lazy(() => object({
  name: string(),
  requires: NAMES().optional(),
  setup: func(),
}));

const MATCH_WHERE_OPTIONS = /*#__PURE__*/ lazy(() => object({
  field: func(),
  operators: record(unknown()).optional(),
}));

const FTS5_QUERY_OPTIONS = /*#__PURE__*/ lazy(() => object({
  prefix: union([
    boolean(),
    literal('both'),
  ]).optional(),
}));

const FTS5_PHRASE_OPTIONS = /*#__PURE__*/ lazy(() => object({
  prefix: boolean().optional(),
}));

const TRANSACTION_OPTIONS = /*#__PURE__*/ lazy(() => object({
  immediate: boolean().optional(),
}));

/** The schemas of the module's options, by what takes them. */
const SCHEMAS = {
  selectFrom: SELECT_OPTIONS,
  insertInto: INSERT_OPTIONS,
  update: UPDATE_OPTIONS,
  deleteFrom: DELETE_OPTIONS,
  sqlCompiler: COMPILER_OPTIONS,
  sqliteAdapter: COMPILER_OPTIONS,
  sqlDialect: DIALECT,
  matchWhere: MATCH_WHERE_OPTIONS,
  fts5Query: FTS5_QUERY_OPTIONS,
  fts5Phrase: FTS5_PHRASE_OPTIONS,
  transaction: TRANSACTION_OPTIONS,
};

/**
 * Checks a member's options — in development only (`api-input-validation.md`, lab D-023): an unknown key with the
 * nearest known one, a value of the wrong kind with what was expected.
 *
 * @param member - The member that takes them: `selectFrom`, `sqlCompiler`, ….
 * @param options - What the caller passed; `undefined` is `{}`.
 * @throws {TypeError} `[fundamentool/sql] selectFrom: unknown option "were". Did you mean "where"?`.
 */
export function checkOptions(member: keyof typeof SCHEMAS, options: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    SCHEMAS[member]().parse(options === undefined ? {} : options, `${WHERE} ${member}`);
  }
}
