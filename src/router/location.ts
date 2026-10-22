// A location from a change — the one rule every step uses; and what "under a path" means.
import {
  urlExtend,
} from '../urlExtend';
import {
  urlParse,
} from '../urlParse';
import type {
  TUrlProps,
} from '../urlParse';
import {
  ROOT_PATH,
  SEGMENT_SEPARATOR,
} from './constants';

/**
 * The location a step goes to: `change.path` (or the current path) with `change.query` (none when not given). Read
 * back from its address — after a step exactly what a reload gives (`'3'` → `3`, D-028).
 *
 * @example
 * locate({ path: '/level/2' }, current); // => /level/2, no query
 * locate({ query: { tab: 'map' } }, current); // => the current path with ?tab=map
 */
export function locate(change: Partial<TUrlProps>, current: TUrlProps): TUrlProps {
  return urlParse(urlExtend(change.path || current.path || ROOT_PATH, {
    query: change.query || null,
  }).href);
}

/**
 * What every path under `path` starts with (`/shop` → `/shop/`, `/` → `/`): a path is under it when it starts with
 * this. Computed once per path, where the path is known.
 *
 * @example
 * const under = pathPrefix('/shop');
 * '/shop/42'.startsWith(under); // => true; '/shopping' — false
 */
export function pathPrefix(path: string): string {
  return path.endsWith(SEGMENT_SEPARATOR) ? path : path + SEGMENT_SEPARATOR;
}

/**
 * A link's `href` read the way `<a href>` reads it, against the current location of the router's part: `/x` —
 * absolute, `?q=1` — the current path with this query, `42` / `../x` — relative to the current path's folder.
 *
 * @example
 * resolveHref('?sort=name', urlParse('/catalog?sort=price')); // => /catalog?sort=name
 * resolveHref('42', urlParse('/catalog/')); // => /catalog/42
 */
export function resolveHref(href: string, current: TUrlProps): TUrlProps {
  // urlExtend reads a string as `<a href>` does (D-056); the router's part keeps the path and the query
  const target = urlExtend(current.href || ROOT_PATH, href);
  return urlParse(target.path + (target.search ? '?' + target.search : ''));
}
