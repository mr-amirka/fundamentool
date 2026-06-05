/**
 * Returns a promise that resolves after the specified timeout.
 *
 * @param millis - Timeout in milliseconds (defaults to 0).
 * @param params - Optional value to resolve with.
 * @returns A Promise that resolves after the timeout.
 * @example
 * await wait(200);            // resolves after 200ms
 * await wait(100, 'done');    // resolves with 'done' after 100ms
 */
export const wait = <A>(millis?: number, params?: A): Promise<A> => {
  return new Promise<A>((resolve) => {
    setTimeout(resolve, millis || 0, params);
  });
};
