import { isDefined } from './is/isDefined';

export interface IStack<T> {
  /**
   * Pops the last item from the stack.
   * 
   * @returns The popped item.
   */
  pop(): T | undefined;

  /**
   * Pushes an item onto the stack.
   * 
   * @param data - The item to push.
   */
  push(data: T | null | undefined): void;

  /**
   * Iterates over the stack and pops each item.
   * 
   * @param iteratee - The function to call for each item.
   */
  eachPop(iteratee: (item: T) => void): void;

  /**
   * Checks if the stack has any items.
   * 
   * @returns Whether the stack has any items.
   */
  has(): boolean;
}

/**
 * Simple FIFO stack/queue based on a linked list.
 * 
 * @param T - The type of the items in the stack.
 * @returns A stack instance with `push`, `pop`, `eachPop`, and `has` methods.
 * @example
 * const stack = stackProvider<number>();
 * stack.push(1); stack.push(2);
 * stack.pop(); // => 1
 */
export const stackProvider = <T = any>(): IStack<T> => {
  // Node: [value, next]
  let first: [T | 0, any] = [0 as any, 0];
  let last = first;

  return {
    pop(): T | undefined {
      const next = first[1];
      if (next) {
        first = next;
        return next[0] as T;
      }
      return undefined;
    },
    push(data: T | null | undefined): void {
      if (isDefined(data)) {
        last = (last[1] = [data as T, 0] as any);
      }
    },
    eachPop(iteratee: (item: T) => void): void {
      let next: any;
      while ((next = first[1])) {
        first = next;
        iteratee(next[0] as T);
      }
    },
    has(): boolean {
      return !!first[1];
    },
  };
};

