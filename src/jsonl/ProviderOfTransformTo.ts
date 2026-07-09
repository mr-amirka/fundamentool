import {
  childClass, 
} from '../childClass';
import {
  noop, 
} from '../noop';

const originalStringify = JSON.stringify;

export interface Transform {
  _transform: (chunk: any, _encoding: string, done: (err?: any) => void) => void;
  _flush: (done: (err?: any) => void) => void;
  _initOnDrain?: () => (resolve: () => void, reject: (err: any) => void) => void;
  push: (value: any) => void;
}

interface TransformConstructor {
  new (...args: any[]): Transform;
}

export interface IJsonlTransformToEnv {
  Transform: TransformConstructor;
}

/**
 * Factory that creates a Transform class for converting objects to JSONL.
 * 
 * @param env - The environment to use for the Transform class.
 * @returns A Transform class for converting objects to JSONL.
 * @example
 * const TransformTo = ProviderOfTransformTo({ Transform });
 * const stream = new TransformTo();
 * stream.write({ key: 'value' }); // => '{"key":"value"}\n'
 */
export const ProviderOfTransformTo = (env: IJsonlTransformToEnv): Transform & { drain: () => Promise<void> } => {
  return childClass(
    env.Transform,
    (
      _self: Transform, sup: (options?: any) => void, options?: Record<string, any>,
    ) => {
      sup({
        ...options,
        readableObjectMode: false,
        writableObjectMode: true,
        decodeStrings: false,
      });
    },
    {
      _transform(
        this: any, item: any, _encoding: string, done: (err: any, chunk?: any) => void,
      ) {
        try {
          done(null, originalStringify(item) + '\n');
        } catch (error) {
          return done(error);
        }
      },
      _flush(this: any, done: (err?: any) => void) {
        done();
      },
      _initOnDrain(this: any) {
        let error: any;
        let rejectFn: (err: any) => void = noop;
        let resolveFn: () => void = noop;

        this.on('error', (err: any) => {
          error = err;
          rejectFn(err);
        });
        this.on('drain', () => {
          resolveFn();
        });

        return (resolve: () => void, reject: (err: any) => void) => {
          if (error) {
            reject(error);
            return;
          }
          resolveFn = resolve;
          rejectFn = reject;
        };
      },
      drain(this: any): Promise<void> {
        return new Promise(this._onDrain || (this._onDrain = this._initOnDrain()));
      },
    },
  ) as any;
};

