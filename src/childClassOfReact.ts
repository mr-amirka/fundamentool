import {
  pushArray, 
} from './pushArray';
import {
  extend, 
} from './extend';

/**
 * Creates a "child" class that wraps a Parent constructor.
 * 
 * @param Parent - The parent class to wrap.
 * @param constructor - The constructor to wrap.
 * @param proto - The prototype to extend.
 * @returns The child class.
 * @example
 * const Child = childClassOfReact(Parent, (self, props) => {
 *   self.name = 'child';
 * });
 */
export const childClassOfReact = (
  Parent: any,
  constructor: (self: any, props?: Record<string, any>) => void,
  proto?: Record<string, any>,
) => {
  function Child() {
    const self = this, args: any[] = arguments as any; // eslint-disable-line
    Parent.apply(self, args);
    constructor.apply(self, pushArray([self], args) as any); // eslint-disable-line
  }
  Child.prototype = extend(Object.create(Parent.prototype), proto);
  return Child;
};
