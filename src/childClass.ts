import {
  extend, 
} from './extend';
import {
  pushArray, 
} from './pushArray';

/**
 * Creates a "child" class that wraps a Parent constructor.
 * 
 * @param Parent - The parent class to wrap.
 * @param constructor - The constructor to wrap.
 * @param proto - The prototype to extend.
 * @returns The child class.
 * @example
 * const Child = childClass(Parent, (self, superFn, ...args) => {
 *   self.name = 'child';
 * });
 * The `constructor` receives `(self, superFn, ...args)`.
 */
export function childClass<
  TParent extends new (...args: any[]) => any,
>(
  Parent: TParent,
  constructor: (self: InstanceType<TParent>, superFn: (...args: any[]) => any, ...args: any[]) => void,
  proto?: Record<string, any>,
): new (...args: any[]) => InstanceType<TParent> {
  function Child(this: any, ...args: any[]) {
    const self = this as InstanceType<TParent>;
    const superFn = function(this: any, ...innerArgs: any[]) {
      return Parent.apply(self, innerArgs);
    };
    constructor.apply(self, pushArray([self, superFn], args) as any);
  }
  (Child as any).prototype = extend(Object.create(Parent.prototype), proto);
  return Child as any;
}

