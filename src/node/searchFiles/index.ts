import { extend } from '../../extend';
import { each } from './each';

export * from './each';

/**
 * Recursively collects file paths starting from `folderPath` using `each`.
 *
 * @param folderPath - Root folder to scan.
 * @param options - Options forwarded to `each`, plus any additional settings.
 * @returns Promise resolved with an array of collected paths.
 */
export function searchFilesIndex(
  folderPath: string,
  options?: Record<string, any>,
): Promise<string[]> {
  const output: string[] = [];
  return each(folderPath, extend(extend({}, options), {
    iteratee: output.push.bind(output),
  })).then(() => output);
}


