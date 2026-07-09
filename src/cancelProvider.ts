/**
 * Wraps a clear function and id into a cancel callback.
 * 
 * @param clearFn - The function to clear.
 * @param id - The id to clear.
 * @returns A zero-argument function that cancels the timer/operation.
 * @example
 * const id = setTimeout(fn, 1000);
 * const cancel = cancelProvider(clearTimeout, id);
 * cancel(); // clears the timeout
 */
export const cancelProvider = (clearFn: (id: any) => void,
  id: any): () => void => {
  return () => {
    clearFn(id);
  };
};

