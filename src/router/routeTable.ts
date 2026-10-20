// The route table matched to a path: the first row whose pattern fits, with its parameters decoded.
import {
  routeParseProvider,
} from '../routeParseProvider';
import type {
  TParams,
} from '../unparam';
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
