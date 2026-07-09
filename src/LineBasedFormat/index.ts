import type {
  ILineBasedFormatOptions, 
} from './types';

export * from './types';

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
  public parse: (input: string) => any;
  public stringify: (input: any) => string;

  constructor(options: ILineBasedFormatOptions) {
    const {
      parse, stringify, 
    } = options;
    this.parse = (input: string): any[] => input.split(REGEXP_LINE_BREAK).map(parse);
    this.stringify = (input: any[]): string => input.map(stringify).join('\n');
  }
}
