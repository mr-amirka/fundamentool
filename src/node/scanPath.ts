import { noop } from '../noop';
import { extend } from '../extend';
import { each } from  './searchFiles/each';

export interface IScanPathOptions {
  path: string;
  each?: (event: 'found', path: string) => void;
  exclude?: (path: string) => boolean;
  [key: string]: any;
}

/**
 * Scans directory tree and calls `each('found', path)` for every file
 * that is not excluded by `exclude(path)`.
 *
 * @param options - Scan options including `path`, optional `each` callback and `exclude` predicate.
 * @returns Promise resolved when the full scan is complete.
 * @example
 * await scanPath({
 *   path: './src',
 *   each: (event, filePath) => console.log(filePath),
 * });
 */
export function scanPath(options: IScanPathOptions): Promise<void> {
  const _each = options.each || noop;
  const _exclude = options.exclude || noop;
  return each(
    options.path,
    extend(extend({} as any, options), {
      iteratee: (path: string) => {
        _exclude(path) || _each('found', path);
      },
    }),
  );
}

