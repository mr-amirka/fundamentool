export interface ILineBasedFormatOptions {
  /**
   * Parses a string into an array of values.
   * 
   * @param input - The string to parse.
   * @returns The array of values.
   */
  parse: (input: string) => any;
  /**
   * Stringifies an array of values into a string.
   * 
   * @param input - The array of values to stringify.
   * @returns The stringified values.
   */
  stringify: (input: any) => string;
}

const REGEXP_LINE_BREAK = /\r?\n/;

/**
 * Formats line-based data using pluggable `parse` and `stringify` functions.
 *
 * @example
 * const fmt = new LineBasedFormat({
 *   parse: (line) => JSON.parse(line),
 *   stringify: (v) => JSON.stringify(v),
 * });
 * fmt.parse('{"a":1}\n{"b":2}'); // => [{ a: 1 }, { b: 2 }]
 * fmt.stringify([{ a: 1 }]);     // => '{"a":1}'
 */
export class LineBasedFormat { 
  /**
   * Parses a string into an array of values.
   * 
   * @param input - The string to parse.
   * @returns The array of values.
   */
  public parse: (input: string) => any;
  /**
   * Stringifies an array of values into a string.
   * 
   * @param input - The array of values to stringify.
   * @returns The stringified values.
   */
  public stringify: (input: any) => string;

  /**
   * Creates a new line-based format.
   * 
   * @param options - The options for the line-based format.
   */
  constructor(options: ILineBasedFormatOptions) {
    const { parse, stringify } = options;
    this.parse = (input: string): any[] => input.split(REGEXP_LINE_BREAK).map(parse);
    this.stringify = (input: any[]): string => input.map(stringify).join('\n');
  }
}