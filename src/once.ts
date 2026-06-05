/**
 * Wraps a function so that it is executed only once.
 * 
 * @param func - The function to wrap.
 * @returns The wrapped function.
 * @example
 * const onceFunc = once(() => console.log('once'));
 * onceFunc(); // => 'once'
 * onceFunc();
 */
export function once<T extends (...args: any) => any>(func: T): T {
  let result: ReturnType<T>;
  return function() {
    if (func) {
      result = func.apply(this, arguments);
      (func as any) = 0;
    }
    return result;
  } as T;
}