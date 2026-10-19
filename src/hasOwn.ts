/**
 * Whether an object has its own property — `Object.hasOwn` (safe for objects without a prototype or with their own
 * `hasOwnProperty`).
 *
 * @param obj - The object to check the property of.
 * @param key - The property to check.
 * @returns Whether the object has the property.
 * @example
 * hasOwn({ a: 1 }, 'a'); // => true
 * hasOwn({ a: 1 }, 'toString'); // => false
 */
export const hasOwn = Object.hasOwn;

