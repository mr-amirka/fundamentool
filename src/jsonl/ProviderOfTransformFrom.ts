import { childClass } from '../childClass';

const originalParse = JSON.parse;

declare class StringDecoder {
  constructor(encoding?: string);
  write(chunk: string): string;
}

export interface IJsonlTransformFromEnv {
  Transform: TransformConstructor;
  StringDecoder: typeof StringDecoder;
}

interface Transform {
  _transform: (chunk: any, _encoding: string, done: (err?: any) => void) => void;
  _flush: (done: (err?: any) => void) => void;
  push: (value: any) => void;
}

interface TransformConstructor {
  new (...args: any[]): Transform;
}

export interface IJsonlTransformFrom extends Transform {
  drain: () => Promise<void>;
}

/**
 * Factory that creates a Transform class for parsing JSONL into objects.
 * 
 * @param env - The environment to use for the Transform class.
 * @returns A Transform class for parsing JSONL into objects.
 * @example
 * const TransformFrom = ProviderOfTransformFrom({ Transform, StringDecoder });
 * stream.pipe(new TransformFrom()).on('data', (obj) => console.log(obj));
 */
export const ProviderOfTransformFrom = (env: IJsonlTransformFromEnv): IJsonlTransformFrom => {
  const { StringDecoder } = env;

  return childClass(
    env.Transform,
    (self: Transform, sup: (options?: any) => void, options?: Record<string, any>) => {
      sup({
        ...options,
        readableObjectMode: true,
        writableObjectMode: false,
        decodeStrings: false,
      });

      // const decoder = new StringDecoder('utf8');
      const decoder = new StringDecoder();
      let lineCount = 0;
      let prev: string | undefined;

      function getLineError(error: any): Error {
        return new Error(
          `Parse error on line ${lineCount}:\n${error.toString()}`,
        );
      }

      self._transform = (chunk: any, _encoding: string, done: (err?: any) => void) => {
        const text: string = decoder.write(chunk);
        const length = text.length;
        let start = 0;
        let i = 0;
        let current: string | undefined;

        for (; i < length; i++) {
          if (text[i] === '\n') {
            current = text.slice(start, i);
            if (text[i + 1] === '\r') {
              i++;
            }
            start = i + 1;
            if (prev) {
              current = prev + current;
              prev = undefined;
            }
            lineCount++;
            try {
              self.push(originalParse(current));
            } catch (error) {
              // eslint-disable-next-line no-console
              // console.error('ProviderOfTransformFrom parse', error);
              done(getLineError(error));
              return;
            }
          }
        }

        current = text.slice(start, length);
        if (current) {
          prev = prev ? prev + current : current;
        }
        done();
      };

      self._flush = (done: (err?: any) => void) => {
        try {
          prev && self.push(originalParse(prev));
        } catch (error) {
          return done(getLineError(error));
        }
        done();

        function getLineError(error: any): Error {
          return new Error(
            `Parse error on line ${lineCount}:\n${error.toString()}`,
          );
        }
      };
    },
  ) as any;
};


