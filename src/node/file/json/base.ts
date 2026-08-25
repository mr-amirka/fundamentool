import {
  write as writeFile,
  read as readFile,
} from '../base';

/**
 * Serializes `data` to JSON and writes it to `path.json`.
 *
 * @param path - File path without extension.
 * @param data - Value to serialize.
 * @param options - Pass `{ minify: true }` to write compact JSON.
 * @returns Promise that resolves when the file is written.
 * @example
 * await write('/config/settings', { theme: 'dark' });
 */
export const write = (
  path: string, data: any, options?: {
    minify?: boolean
  } | null,
) => {
  return writeFile(
    path + '.json', JSON.stringify(
      data, null, options?.minify ? '' : ' ',
    ), 'utf8',
  );
};

/**
 * Reads and JSON-parses the file at `path.json`.
 *
 * @param path - File path without extension.
 * @returns Promise resolving to the parsed value.
 * @example
 * const settings = await read('/config/settings');
 */
export const read = (path: string) => {
  return readFile(path + '.json', 'utf8').then(JSON.parse);
};
