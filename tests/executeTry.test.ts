import {
  executeTry, 
} from '../src/executeTry';

describe('executeTry', () => {
  test('returns the function result on success', () => {
    expect(executeTry(() => 42)).toBe(42);
    expect(executeTry(() => 'hello')).toBe('hello');
  });

  test('returns undefined when function throws', () => {
    expect(executeTry(() => {
      throw new Error('fail'); 
    })).toBeUndefined();
  });

  test('calls onError with the thrown error', () => {
    const onError = jest.fn();
    const error = new Error('oops');
    executeTry(
      () => {
        throw error; 
      }, [], null, onError,
    );
    expect(onError).toHaveBeenCalledWith(error);
  });

  test('passes args to the function', () => {
    const fn = jest.fn((a, b) => a + b);
    const result = executeTry(fn, [1, 2]);
    expect(result).toBe(3);
  });
});
