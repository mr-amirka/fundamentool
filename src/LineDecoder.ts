import { noopHandle } from "./noopHandle";

export interface ILineDecoderBaseOptions {
  /**
   * Whether to skip empty lines.
   * 
   * @default false
   */
  skipEmptyLines?: boolean;
}
export interface ILineDecoderOptions<T = any> extends ILineDecoderBaseOptions {
  /**
   * Parses a line of text into a value.
   * 
   * @param line - The line of text to parse.
   * @returns The value.
   */
  parse?: (line: string) => T;
}

export interface ILineDecoderConstructor<T = any> {
  /**
   * Creates a new line decoder.
   *
   * @param options - The options for the line decoder.
   * @returns The line decoder.
   */
  new (options?: ILineDecoderBaseOptions): BaseLineDecoder<T>;
}

export interface BaseLineDecoder<T = any> {
  /**
   * Writes a chunk of text to the decoder.
   * 
   * @param chunk - The chunk of text to write.
   * @param output - The output array to write the chunk to.
   * @returns The output array.
   */
  write(chunk: string, output?: T[] | null): T[];
  /**
   * Ends the decoder.
   * 
   * @param chunk - The chunk of text to end the decoder with.
   * @param output - The output array to end the decoder with.
   * @returns The output array.
   */
  end(chunk?: string, output?: T[] | null): T[];
}

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
  /**
   * Writes a chunk of text to the decoder.
   * 
   * @param chunk - The chunk of text to write.
   * @param output - The output array to write the chunk to.
   * @returns The output array.
   */
  write!: (chunk: string, output?: T[] | null) => T[];
  /**
   * Ends the decoder.
   * 
   * @param chunk - The chunk of text to end the decoder with.
   * @param output - The output array to end the decoder with.
   * @returns The output array.
   */
  end!: (chunk?: string, output?: T[] | null) => T[];

  /**
   * Creates a new line decoder.
   * 
   * @param options - The options for the line decoder.
   * @returns The line decoder.
   */
  static create<T = any>(options: ILineDecoderOptions<T>): LineDecoder<T> {
    return new LineDecoder<T>(options);
  }

  /**
   * Creates a new line decoder provider.
   * 
   * @param parse - The function to parse a line of text into a value.
   * @returns The line decoder provider.
   */
  static provider<T = any>(parse: (line: string) => T): ILineDecoderConstructor<T> {
    class Decoder {
      write!: (chunk: string, output?: T[] | null) => T[];
      end!: (chunk?: string, output?: T[] | null) => T[];

      constructor(options: ILineDecoderBaseOptions = {}) {
        const lineDecoder = new LineDecoder({
          ...options,
          parse,
        });

        this.write = lineDecoder.write;
        this.end = lineDecoder.end;
      }
    }
    return Decoder;
  }

  /**
   * Creates a new line decoder.
   * 
   * @param options - The options for the line decoder.
   * @returns The line decoder.
   */
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
