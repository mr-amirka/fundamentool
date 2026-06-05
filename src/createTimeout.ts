/**
 * Creates a timeout.
 * 
 * @param callback - The callback to call when the timeout is ready.
 * @param timeout - The timeout to call the callback.
 * @param args - The arguments to pass to the callback.
 * @param ctx - The context to pass to the callback.
 * @returns The function to stop the timeout.
 * @example
 * const cancel = createTimeout(() => console.log('done'), 1000);
 * cancel(); // cancels before it fires
 */
export const createTimeout = (
  callback: (...args: any[]) => any,
  timeout?: number,
  args?: ArrayLike<any> | null,
  ctx?: any,
): () => void => {
  let intervalId: any = setTimeout(() => {
    callback && callback.apply(ctx || null, args || []);
  }, timeout || 0);

  return () => {
    intervalId && clearTimeout(intervalId);
    intervalId = 0;
    (callback as any) = 0;
  };
};
