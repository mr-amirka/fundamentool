import { noopHandle } from '../noopHandle';
import type { ILineDecoderOptions, ILineDecoderBaseOptions, ILineDecoderConstructor } from './types';

export * from './types';

const CODE_LF = 10;
const CODE_CR = 13;

/**
 * Streaming line splitter for `\n` and `\r\n` line endings.
 * Not tied to JSONL; suitable for CSV, logs, NDJSON, and similar line-based formats.
 *
 * @example
 * const decoder = new LineDecoder({ parse: (line) => JSON.parse(line) });
 * decoder.write('{"a":1}\n{"b"'); // => [{ a: 1 }]
 * decoder.end('2}');              // => [{ b: 2 }]
 */
export class LineDecoder<T = any> {
  write!: (chunk: string, output?: T[] | null) => T[];
  end!: (chunk?: string, output?: T[] | null) => T[];

  static create<T = any>(options: ILineDecoderOptions<T>): LineDecoder<T> {
    return new LineDecoder<T>(options);
  }

  static provider<T = any>(parse: (line: string) => T): ILineDecoderConstructor<T> {
    class Decoder {
      write!: (chunk: string, output?: T[] | null) => T[];
      end!: (chunk?: string, output?: T[] | null) => T[];

      constructor(options: ILineDecoderBaseOptions = {}) {
        const lineDecoder = new LineDecoder({ ...options, parse });
        this.write = lineDecoder.write;
        this.end = lineDecoder.end;
      }
    }
    return Decoder;
  }

  constructor(options: ILineDecoderOptions = {}) {
    const parse = options.parse || noopHandle;
    const skipEmpty = options.skipEmptyLines !== false;
    let tail: string | undefined;
    let lineCount = 0;

    const consume = (output: T[], text: string): T[] => {
      const len = text.length;
      let carry = tail;
      let start = 0;
      let i = 0;
      let end = 0;
      let line = '';
      let part = '';

      for (; i < len; i++) {
        if (text.charCodeAt(i) !== CODE_LF) {
          continue;
        }

        end = i;
        if (end > start && text.charCodeAt(end - 1) === CODE_CR) {
          end--;
        }

        line = text.slice(start, end);
        start = i + 1;

        if (typeof carry !== 'undefined') {
          line = carry + line;
          carry = undefined;
        }
        if (!line && skipEmpty) {
          continue;
        }
        lineCount++;
        try {
          output.push(parse(line) as T);
        } catch (error: any) {
          throw new Error(`Parse error on line ${lineCount}:\n${error.toString()}`);
        }
      }

      if (start < len) {
        part = text.slice(start, len);
        carry = typeof carry !== 'undefined' ? carry + part : part;
      }

      tail = carry;
      return output;
    };

    this.write = (chunk: string, output?: T[] | null) => consume(output || [], chunk);

    this.end = (chunk?: string, output?: T[] | null) => {
      output = output || [];
      if (typeof chunk !== 'undefined') {
        consume(output, chunk);
      }
      const rest = tail;
      tail = undefined;
      if (typeof rest !== 'undefined' && (!skipEmpty || rest)) {
        consume(output, rest + '\n');
      }
      return output;
    };
  }
}
