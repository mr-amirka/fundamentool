import {
  isFunction, 
} from './is/isFunction';
import {
  forEach, 
} from './forEach';

export type Decorator<T extends (...args: any[]) => any> = (emit: T) => T;

export interface IDecorate<T extends (...args: any[]) => any> {
  (emit: T): T;
  use: (decorator: Decorator<T>) => IDecorate<T>;
}

/**
 * Decorates a function.
 * 
 * @param emit - The function to decorate.
 * @param decorators - The decorators to apply.
 * @returns The decorated function with the `use` method.
 * @example
 * const fn = decorate(x => x, [logger, cache]);
 * fn.use(anotherDecorator);
 */
export const decorate = <T extends (...args: any[]) => any>(
  emit: T,
  decorators: Decorator<T> | Array<Decorator<T>>,
): IDecorate<T> => {
  function instance(this: any, ...args: any[]) {
    return emit.apply(null, args);
  }

  function use(decorator: Decorator<T>): IDecorate<T> {
    emit = decorator(emit);
    return instance;
  }

  isFunction(decorators)
    ? use(decorators as Decorator<T>)
    : forEach(decorators, use);

  instance.use = use;
  return instance as IDecorate<T>;
};

