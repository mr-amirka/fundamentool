
/**
 * Safely executes a function with the given context and arguments.
 *
 * If the function throws, the optional `onError` handler is called
 * and the function returns `undefined`.
 * 
 * @param fn - The function to execute.
 * @param args - The arguments to pass to the function.
 * @param context - The context to pass to the function.
 * @param onError - The error handler.
 * @returns The result of the function, or `undefined` if an error occurred.
 * @example
 * executeTry(() => JSON.parse('bad'));            // => undefined
 * executeTry(() => 42);                           // => 42
 */
export const executeTry = <T>(
  fn: (...args: any[]) => T,
  args?: any[] | IArguments | null,
  context?: any,
  onError?: (error: unknown) => void,
): T | undefined => {
  try {
    return fn.apply(context, args || []);
  } catch (error) {
    onError?.(error);
  }
}
