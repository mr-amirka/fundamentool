/**
 * Creates a function that always returns the given constant value.
 *
 * @param v - The value to wrap.
 * @returns A zero-argument function that always returns `v`.
 * @example
 * const getZero = wrapper(0);
 * getZero(); // => 0
 */
export function wrapper<A>(v: A): () => A {
  return () => v;
}