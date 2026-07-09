import {
  write as originWriteJson,
  read as originReadJson,
} from './base';


/**
 * Writes a JSON snapshot to both `path` and `path.recov` for redundancy.
 *
 * @param path - File path without extension.
 * @param data - Value to serialize.
 * @param options - Pass `{ minify: true }` for compact JSON.
 * @returns Promise that resolves when both files are written.
 * @example
 * await write('/config/settings', { theme: 'dark' });
 */
export const write: (typeof originWriteJson) = async (
  path, data, options,
) => {
  await originWriteJson(
    path, data, options,
  );
  return originWriteJson(
    path + '.recov', data, options,
  );
};

/**
 * Reads a JSON snapshot, falling back to the `.recov` copy on failure, then to `onInit()`.
 *
 * @param path - File path without extension.
 * @param onInit - Optional factory called when both copies are unavailable.
 * @returns Promise resolving to the parsed value, recovery data, or `onInit()` result.
 * @example
 * const settings = await read('/config/settings', () => ({ theme: 'light' }));
 */
export const read = (path: string, onInit?: (() => any) | null | undefined) => {
  return originReadJson(path)
    .catch((error) => {
      console.warn(
        'Original snapshot in not available', path, error,
      );
      return originReadJson(path + '.recov');
    })
    .catch((error) => {
      console.error(
        'Recovery snapshot in not available', path, error,
      );
      return onInit ? onInit() : null;
    });
};