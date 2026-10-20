// The route table matched to a path: the first row whose pattern fits, with its parameters decoded.
import {
  routeParseProvider,
} from '../routeParseProvider';
import type {
  TParams,
} from '../unparam';
import {
  ROOT_PATH,
  SEGMENT_SEPARATOR,
} from './constants';
import type {
  TRouteRow,
  TRouteRowBase,
} from './types';

/** A row a path matched and the parameters its pattern gave. */
export type TRouteMatch<R> = {
  row: TRouteRowBase & R;
  params: TParams;
};

/**
 * A matcher over the table: the first row whose pattern fits `path`, its parameters decoded (a link writes them with
 * `encodeURIComponent`); `null` when none does. `-` and `_` match each other in a pattern's plain part, before its
 * first group.
 *
 * @example
 * const match = routeTableMatcher([['/', { main: Home }], ['/level/:levelId', { main: Level }]]);
 * match('/level/L%2F1'); // => { row: { main: Level }, params: { levelId: 'L/1' } }
 */
export function routeTableMatcher<R>(rows: readonly TRouteRow<R>[]): (path: string) => TRouteMatch<R> | null {
  const compiled = rows.map(([
    pattern,
    row,
  ]) => {
    const group = pattern.indexOf('(');
    const plainEnd = group < 0 ? pattern.length : group;
    return [
      routeParseProvider(pattern.slice(0, plainEnd).replace(/[-_]/g, '[-_]') + pattern.slice(plainEnd)),
      row,
    ] as const;
  });
  const length = compiled.length;
  return (path) => {
    let params: TParams;
    for (let i = 0; i < length; i++) {
      params = {};
      if (compiled[i][0](path, params)) {
        const decoded: TParams = {};
        // A group left out leaves no key; every value there is is a string.
        for (const key of Object.keys(params)) {
          decoded[key] = decodeURIComponent(params[key] as string);
        }
        return {
          row: compiled[i][1],
          params: decoded,
        };
      }
    }
    return null;
  };
}

/** Where a pattern's fixed part ends: its first parameter, group or pattern sign. */
const PATTERN_SIGN = /[:(*?+[\]^$\\]/;

/**
 * The fixed path a pattern starts with — the part before its first parameter, without a trailing `/` (but `/` stays
 * `/`); a fixed pattern is its own path.
 *
 * @example
 * fixedPathOf('/user/:id/posts'); // => '/user'
 * fixedPathOf('/feed'); // => '/feed'
 */
export function fixedPathOf(pattern: string): string {
  const sign = pattern.search(PATTERN_SIGN);
  const fixed = sign < 0 ? pattern : pattern.slice(0, sign);
  return fixed.length > 1 && fixed.endsWith(SEGMENT_SEPARATOR) ? fixed.slice(0, -1) : fixed || ROOT_PATH;
}

/**
 * Whether a pattern has no parameters — it names one path.
 *
 * @example
 * isFixedPattern('/feed'); // => true; '/user/:id' — false
 */
export function isFixedPattern(pattern: string): boolean {
  return !PATTERN_SIGN.test(pattern);
}
