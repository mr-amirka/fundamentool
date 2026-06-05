import { reduce } from './reduce';

function iterateeBindMethods<T extends Record<string, any>>(
  self: T,
  method: keyof T & string,
): T {
  self[method] = self[method].bind(self);
  return self;
}

/**
 * Binds all listed methods of an object to that object in-place.
 *
 * @param self - The object whose methods to bind.
 * @param methods - Array of method names to bind.
 * @returns The same `self` object with the methods bound.
 * @example
 * class Foo {
 *   value = 1;
 *   inc() { this.value += 1; }
 * }
 *
 * const foo = new Foo();
 * bindMethods(foo, ['inc']);
 */
export function bindMethods<T extends Record<string, any>>(
  self: T,
  methods: Array<keyof T & string>,
): T {
  return reduce(methods, iterateeBindMethods as any, self);
}

