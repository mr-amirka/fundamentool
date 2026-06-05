import { stackProvider } from '../src/stackProvider';

describe('stackProvider', () => {
  test('push and pop returns items in FIFO order', () => {
    const stack = stackProvider<number>();
    stack.push(1);
    stack.push(2);
    stack.push(3);
    expect(stack.pop()).toBe(1);
    expect(stack.pop()).toBe(2);
    expect(stack.pop()).toBe(3);
  });

  test('pop returns undefined when empty', () => {
    const stack = stackProvider<number>();
    expect(stack.pop()).toBeUndefined();
  });

  test('has() returns false when empty', () => {
    const stack = stackProvider();
    expect(stack.has()).toBe(false);
  });

  test('has() returns true after push', () => {
    const stack = stackProvider();
    stack.push('item');
    expect(stack.has()).toBe(true);
  });

  test('has() returns false after all items popped', () => {
    const stack = stackProvider<number>();
    stack.push(1);
    stack.pop();
    expect(stack.has()).toBe(false);
  });

  test('eachPop() iterates all items and empties stack', () => {
    const stack = stackProvider<number>();
    stack.push(1);
    stack.push(2);
    stack.push(3);
    const result: number[] = [];
    stack.eachPop((item) => result.push(item));
    expect(result).toEqual([1, 2, 3]);
    expect(stack.has()).toBe(false);
  });

  test('ignores null/undefined in push', () => {
    const stack = stackProvider<number>();
    stack.push(null);
    stack.push(undefined);
    expect(stack.has()).toBe(false);
  });
});
