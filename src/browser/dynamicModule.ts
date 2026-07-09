/**
 * Wraps async module initializer so that it is executed only once.
 * 
 * @param init - The initializer function.
 * @returns A function that returns a Promise resolved with the initializer result (cached after first call).
 * @example
 * const loadLib = dynamicModule(() => import('./heavy-module'));
 * await loadLib(); // runs init only once; subsequent calls return the cached result
 */
export function dynamicModule<
  TOptions extends Record<string, any> = Record<string, any>,
  TResult = any,
>(init: (options?: TOptions) => Promise<TResult> | TResult) {
  let promise: Promise<TResult> | null = null;
  return (options?: TOptions): Promise<TResult> =>
    promise ||
    (promise = Promise.resolve(options as TOptions)
      .then(init)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
        promise = null;
        throw error;
      }));
}

