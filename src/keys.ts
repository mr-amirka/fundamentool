/**
 * Returns enumerable keys of an object as an array of strings.
 * 
 * @param obj - The object to get the keys of.
 * @returns The keys of the object.
 * @example
 * keys({ a: 1, b: 2 }) // => ['a', 'b']
 */
export const keys = Object.keys as (obj: Record<string, any>) => string[];
