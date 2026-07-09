import {
  write as writeFile,
  read as readFile,
} from '../base';
import {
  parse,
  parseEachLine,
  stringify,
  TParseEachLineCallback,
} from '../../../csv';

/**
 * Writes a 2D array to a `.csv` file at `path` (`.csv` extension appended automatically).
 *
 * @param path - File path without extension.
 * @param data - 2D array of values to serialize.
 * @returns Promise that resolves when the file is written.
 * @example
 * await write('/data/report', [[1, 2], [3, 4]]);
 */
export const write = (path: string, data: any) => {
  return writeFile(
    path + '.csv', stringify(data), 'utf8',
  );
};

/**
 * Reads and parses a `.csv` file into a 2D array.
 *
 * @param path - File path without extension.
 * @param output - Optional array to push rows into.
 * @returns Promise resolving to the populated 2D array.
 * @example
 * const rows = await read('/data/report'); // => [[1, 2], [3, 4]]
 */
export const read = async (path: string, output: any[][] = []) => {
  return parse(await readFile(path + '.csv', 'utf8'), output);
};

/**
 * Reads a `.csv` file and calls `callback` for each parsed row.
 *
 * @param path - File path without extension.
 * @param callback - Called with each parsed row array.
 * @returns Promise that resolves after all rows are processed.
 * @example
 * await readEachLine('/data/report', (row) => console.log(row));
 */
export const readEachLine = async (path: string, callback: TParseEachLineCallback) => {
  parseEachLine(await readFile(path + '.csv', 'utf8'), callback);
};
