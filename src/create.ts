/**
 * Safe `Object.create` wrapper.
 *
 * @example
 * const obj = create({ greet() { return 'hi'; } });
 * obj.greet(); // => 'hi'
 * create(null); // => plain object with no prototype
 */
export const create = Object.create;

