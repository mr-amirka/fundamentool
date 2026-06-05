const resolve = Promise.resolve.bind(Promise);

/**
 * Wraps a function in a promise and returns a promise that resolves with the result of the function.
 *
 * @param fn - The function to wrap.
 * @returns A promise that resolves with the result of the function.
 * @example
 * await asAsync(() => 42);           // => 42
 * await asAsync(() => fetch('/api')); // waits for the fetch
 */
export const asAsync = <A>(fn: () => A | Promise<A>): Promise<A> => resolve().then(fn);
