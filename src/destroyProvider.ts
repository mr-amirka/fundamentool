import { forEach } from './forEach';
import { removeOf } from './removeOf';
import { eachApply } from './eachApply';

export type TDestroyFn = () => void;

export interface IDestroyer {
  (): boolean;
  add: (...fns: TDestroyFn[]) => IDestroyer;
  remove: (fn: TDestroyFn) => IDestroyer;
  child: () => IDestroyer;
  isDestroyed: () => boolean;
  clear: () => IDestroyer;
}

/**
 * Accumulates destroyer callbacks and executes them once when called.
 * 
 * @param initial - The initial destroyer functions.
 * @returns A destroyer instance. Call it to run all callbacks; returns `true` if not already destroyed.
 * @example
 * const destroy = destroyProvider();
 * destroy.add(() => console.log('cleaned up'));
 * destroy(); // => true, logs 'cleaned up'
 * destroy(); // => false (already destroyed)
 */
export const destroyProvider = (initial?: TDestroyFn[]): IDestroyer => {
  let destroyers: TDestroyFn[] | 0 = initial || [];

  function instance(): boolean {
    const current = destroyers;
    destroyers = 0;
    if (current) {
      eachApply(current);
      return true;
    }
    return false;
  }

  const add = instance.add = (...fns: TDestroyFn[]) => {
    forEach(fns, (fn: TDestroyFn) => {
      if (destroyers) {
        destroyers.push(fn);
      } else {
        fn();
      }
    });
    return instance;
  };

  instance.remove = (fn: TDestroyFn) => {
    destroyers && removeOf(destroyers, fn);
    return instance;
  };

  instance.child = () => {
    const childProvider = destroyProvider();
    add(childProvider);
    return childProvider;
  };

  instance.isDestroyed = () => !destroyers;

  instance.clear = () => {
    if (destroyers) {
      destroyers = [];
    }
    return instance;
  };

  return instance;
}

