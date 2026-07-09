import {
  asAsync, 
} from '../asAsync';
import {
  noop, 
} from '../noop';
import {
  wait, 
} from '../wait';

/**
 * Ensures that calls to `fn` take at least `requestLatency` ms.
 * Useful for smoothing UI latency so fast responses don't cause visual flicker.
 *
 * @param requestLatency - Minimum response time in milliseconds.
 * @returns A function that runs `fn` with the given minimum latency.
 * @example
 * const run = withLatencyProvider(500);
 * await run(fetchData, [], ctx); // always takes at least 500ms
 */
export function withLatencyProvider(requestLatency: number) {
  let promise: Promise<any> = Promise.resolve();

  return function run<T>(
    fn: (...args: any[]) => T | Promise<T>,
    args: any[] = [],
    ctx: any = null,
  ): Promise<T> {
    return (promise = promise.catch(noop).then(() => {
      let errorBox: [error: any] | undefined;
      return Promise
        .all([asAsync(() => fn.apply(ctx, args))
          .catch((error) => {
            errorBox = [error];
          }), wait(requestLatency)])
        .then((responses) => {
          if (errorBox) {
            throw errorBox[0];
          }
          return responses[0] as T;
        });
    }));
  };
}

