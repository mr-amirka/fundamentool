/**
 * Creates an interval.
 * 
 * @param callback - The callback to call when the interval is ready.
 * @param delay - The delay to call the callback.
 * @param args - The arguments to pass to the callback.
 * @param ctx - The context to pass to the callback.
 * @returns The function to stop the interval.
 * @example
 * const stop = createInterval(() => console.log('tick'), 500);
 * stop(); // cancels the interval
 */
export const createInterval = (
  callback: (...args: any[]) => any,
  delay = 250,
  args?: any[],
  ctx?: any,
): () => void => {
  args = args || [];
  ctx = ctx || null;
  let intervalId: any = 0;
  function base() {
    intervalId = setTimeout(() => {
      if (callback) {
        base();
        callback.apply(ctx, args as any);
      }
    }, delay);
  }

  base();

  return () => {
    intervalId && clearTimeout(intervalId);
    intervalId = 0;
    (callback as any) = 0;
  };
};
