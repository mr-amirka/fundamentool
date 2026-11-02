import {
  describeValue,
} from '../describeValue';
import {
  normalizeMatch,
} from '../match/normalizeMatch';
import type {
  TMatch,
  TMatchNode,
} from '../match/types';
import {
  MATCH_KIND,
} from './compiler';
import {
  isSqlNode,
} from './nodes';
import {
  WHERE,
  checkOptions,
} from './options';
import type {
  TMatchOpNode,
  TMatchWhereOptions,
  TSqlNode,
} from './types';

/**
 * A `match` pattern as a condition, its meaning kept (fundamentool D-088, card §4.2): the rows are the ones
 * `matchProvider` gives for the same values. Each operator becomes a node `match:$op` the dialect writes — `sqlite`
 * writes the standard ones; a custom operator needs a preset's `d.node('match:$within', …)`.
 *
 * @param pattern - A pattern (`TMatch`), checked always: it may be an agent's JSON.
 * @param options - `field(path)`: where a field lives — a column or `jsonGet(col('attrs'), path)`; `operators`: the
 * registry, as `fundamentool/match`'s.
 * @returns The condition: `and` / `or` / `not` of operator nodes.
 * @throws {TypeError} a bad pattern (`normalizeMatch`'s errors); a field `field` returns `undefined` for.
 * @example
 * selectFrom('nodes', {
 *   where: and(eq(col('type'), 'decision'), matchWhere(
 *     { status: ['proposed', 'provisional'], $not: { affects: { $has: 'USER_DRAFT' } } },
 *     { field: (path) => jsonGet(col('attrs'), path) },
 *   )),
 * });
 */
export function matchWhere(pattern: TMatch, options: TMatchWhereOptions): TSqlNode {
  checkOptions('matchWhere', options);
  const tree = normalizeMatch(pattern, options.operators ? {
    operators: options.operators,
  } : undefined);
  const field = options.field;
  const fields = new Map<string, TSqlNode>();
  const fieldOf = (path: readonly string[]): TSqlNode => {
    const key = path.join('\u0000');
    let node = fields.get(key);
    if (node === undefined) {
      const found = field(path);
      if (!isSqlNode(found)) {
        throw new TypeError(`${WHERE} matchWhere: no field for ${path.length > 0 ? `"${path.join('.')}"` : 'the top'} — field(path) returned ${describeValue(found)}`);
      }
      node = found;
      fields.set(key, node);
    }
    return node;
  };
  const toSql = (node: TMatchNode): TSqlNode => {
    if (node.kind === 'and' || node.kind === 'or') {
      return {
        kind: node.kind,
        of: node.of.map(toSql),
      };
    }
    if (node.kind === 'not') {
      return {
        kind: 'not',
        of: toSql(node.of),
      };
    }
    const op: TMatchOpNode = {
      kind: `${MATCH_KIND}${node.op}`,
      path: node.path,
      field: fieldOf(node.path),
      argument: node.argument,
    };
    return op;
  };
  return toSql(tree);
}
