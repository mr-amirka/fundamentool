import { wait } from './wait';
import { isPromise } from './is/isPromise';
import { noop } from './noop';

/**
 * Creates a queue provider.
 * 
 * @param options - The options for the queue provider.
 * @returns The queue provider.
 * @example
 * const queue = queueProvider();
 * queue(async () => console.log('hello')); // => void
 * queue(async () => console.log('world')); // => void
 */
export function queueProvider(options?: { onStart?: () => any }) {
  options = options || {};

  const onStart = options.onStart || noop;

  let queuePromise = Promise.resolve();

  return function queue<A extends any[]>(callback: (...args: A) => any, milliseconds?: number) {
    return async (...args: Parameters<typeof callback>) => {
      const promise: any = onStart();
      if (isPromise(promise)) {
        await promise;
      }
      return (queuePromise = (async () => {
        await queuePromise.catch(noop);
        const result = await callback(...args);
        if (milliseconds) {
          await wait(milliseconds);
        }
        return result;
      })());
    };
  };
}
