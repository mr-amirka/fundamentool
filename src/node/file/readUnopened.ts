import {
  Readable, 
} from 'stream';
import {
  readSlice, 
} from './readSlice';
import {
  childClass, 
} from '../../childClass';
import {
  extend, 
} from '../../extend';

const DEFAULT_BUFFER_LENGTH = 1024 * 8;
const DEFAULT_ADDITIONAL_ATTEMPT_LIMIT = 2;
const DEFAULT_TIMEOUT = 60000;

interface IReadUnopenedOptions {
  path: string;
  bufferLength?: number;
  additionaAttemptLimit?: number;
  timeout?: number;
  [key: string]: any;
}

const ReadUnopened = childClass(Readable,
  (
    self: any, _super: any, options: IReadUnopenedOptions,
  ) => {
    const opts: any = extend({}, options);
    const filePath = options.path;
    const bufferLength = options.bufferLength || DEFAULT_BUFFER_LENGTH;
    const additionaAttemptLimit =
      options.additionaAttemptLimit || DEFAULT_ADDITIONAL_ATTEMPT_LIMIT;
    const timeout = options.timeout || DEFAULT_TIMEOUT;

    let position = 0;
    let reading = false;
    let nextFlag = false;

    delete opts.path;
    delete opts.bufferLength;
    delete opts.additionaAttemptLimit;
    delete opts.timeout;

    _super(opts);

    function readChunk(): void {
      readSlice(
        filePath,
        position,
        bufferLength,
        timeout,
        additionaAttemptLimit,
      ).then(onRead, onCatch);
    }

    function onRead(data: { buffer: Buffer | null;
      position: number }): void {
      position = data.position;
      if (nextFlag) {
        nextFlag = false;
        readChunk();
      } else {
        reading = false;
      }

      self.push(data.buffer);
    }

    function onCatch(error: any): void {
      nextFlag = false;
      reading = false;
      // eslint-disable-next-line no-console
      console.error('ReadUnopened', error);
      self.push(null);
    }

    self._read = () => {
      if (reading) {
        nextFlag = true;
        return;
      }

      reading = true;
      readChunk();
    };
  });

/**
 * Creates a `Readable` stream that polls the file at `path` in chunks until EOF.
 * Useful for reading files that are actively being written to (tail-like behaviour).
 *
 * @param path - File path to read from.
 * @param options - Optional options (bufferLength, timeout, etc.).
 * @returns A `Readable` stream emitting file chunks.
 * @example
 * readUnopened('./log.txt').pipe(process.stdout);
 */
export function readUnopened(path: string, options?: Partial<IReadUnopenedOptions>): Readable {
  return new (ReadUnopened as any)(extend(extend({}, options), {
    path,
  }));
}

