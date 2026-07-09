export type TParseEachLineCallback = (line: any[]) => void;

/**
 * Parses a CSV string and calls `callback` for each parsed line.
 * Columns are separated by `;` and URI-decoded, then JSON-parsed where possible.
 *
 * @param input - Raw CSV string.
 * @param callback - Called with an array of parsed column values for each line.
 * @example
 * parseEachLine('1;2;3\n4;5;6', (line) => console.log(line));
 * // => [1, 2, 3], then [4, 5, 6]
 */
export function parseEachLine(input: string, callback: TParseEachLineCallback) {
  const lines = input.split('\n');

  for (const line of lines) {
    callback(line
      .split(';')
      .map((column) => {
        let value = decodeURIComponent(column);
        try {
          value = JSON.parse(value);
        } catch (e) {
          // не JSON — оставляем как декодированную строку
        }
        return value;
      }));
  }
}
/**
 * Parses a CSV string into a 2D array.
 *
 * @param input - Raw CSV string.
 * @param output - Optional output array to push rows into.
 * @returns Array of parsed rows (arrays of values).
 * @example
 * parse('1;2;3\n4;5;6'); // => [[1, 2, 3], [4, 5, 6]]
 */
export function parse(input: string, output: any[][] = []) {
  parseEachLine(input, output.push.bind(output));
  return output;
}
/**
 * Serializes a 2D array into a CSV string.
 * Columns are JSON-encoded and URI-encoded, joined by `;`, rows joined by `\n`.
 *
 * @param data - 2D array of values to serialize.
 * @returns Serialized CSV string.
 * @example
 * stringify([[1, 2, 3], [4, 5, 6]]); // => '1;2;3\n4;5;6'
 */
export function stringify(data: any[][]) {
  const output = [];

  for (const line of data) {
    output.push(line
      .map((column) => encodeURIComponent(JSON.stringify(column)))
      .join(';'));
  }

  return output.join('\n');
}