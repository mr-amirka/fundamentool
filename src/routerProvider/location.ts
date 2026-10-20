// Address helpers: merging a location with a change, reading a path / child / query from a value.
import {
  urlExtend,
} from '../urlExtend';
import type {
  TParams,
} from '../unparam';
import type {
  TUrlProps,
} from '../urlParse';
import {
  NOOP_OBJECT,
} from './constants';

/**
 * Merges two URL properties.
 *
 * @param prev - The previous URL properties.
 * @param extend - The extended URL properties.
 * @returns The merged URL properties.
 * @example
 * mergeLocation({ path: '/user', query: { id: 1 } }, { path: '/user/1', query: { name: 'John' } }); // => { path: '/user/1', query: { id: 1, name: 'John' } }
 */
export function mergeLocation(prev: Partial<TUrlProps>, exten: Partial<TUrlProps>) {
  const child: Partial<TUrlProps> = exten.child || {};
  const prevChild: Partial<TUrlProps> = prev.child || {};
  return urlExtend(exten.path || prev.path, {
    query: exten.query || null,
    child: urlExtend(child.path || prevChild.path, {
      query: child.query || null,
    }),
  });
}

/**
 * Gets the path from a URL properties.
 *
 * @param v - The URL properties.
 * @returns The path.
 * @example
 * getPath({ path: '/user' }); // => '/user'
 */
export function getPath(v: Partial<TUrlProps>) {
  return v.path || '';
}

/**
 * Gets the child from a URL properties.
 *
 * @param v - The URL properties.
 * @returns The child.
 * @example
 * getChild({ child: { path: '/user' } }); // => { path: '/user' }
 */
export function getChild(v: Partial<TUrlProps>): TUrlProps {
  return urlExtend(v.child);
}

/**
 * Gets the query from a URL properties.
 *
 * @param v - The URL properties.
 * @returns The query.
 * @example
 * getQuery({ query: { id: 1 } }); // => { id: 1 }
 */
export function getQuery(v: Partial<TUrlProps>): TParams {
  return v.query || NOOP_OBJECT;
}
