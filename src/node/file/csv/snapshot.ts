import {
  write as originWriteCsv,
  read as originReadCsv,
} from './base';


/**
 * Writes a CSV snapshot to both `path` and `path.recov` for redundancy.
 *
 * @param path - File path without extension.
 * @param data - 2D array of values to serialize.
 * @returns Promise that resolves when both files are written.
 * @example
 * await write('/data/report', [[1, 2], [3, 4]]);
 */
export const write: (typeof originWriteCsv) = async (path, data) => {
  await originWriteCsv(path, data);
  return originWriteCsv(path + '.recov', data);
};

/**
 * Reads a CSV snapshot, falling back to the `.recov` copy on failure, then to `onInit()`.
 *
 * @param path - File path without extension.
 * @param onInit - Optional factory called when both copies are unavailable.
 * @returns Promise resolving to the parsed rows, recovery data, or `onInit()` result.
 * @example
 * const rows = await read('/data/report', () => []);
 */
export const read = (path: string, onInit?: (() => any) | null | undefined) => {
  return originReadCsv(path)
    .catch((error) => {
      console.warn('Original snapshot in not available', path, error);
      return originReadCsv(path + '.recov');
    })
    .catch((error) => {
      console.error('Recovery snapshot in not available', path, error);
      return onInit ? onInit() : null;
    });
};