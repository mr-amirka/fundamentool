import {
  eachApply, 
} from '../src/eachApply';
import {
  eachApplyMap, 
} from '../src/eachApplyMap';
import {
  eachTry, 
} from '../src/eachTry';
import {
  executeTry, 
} from '../src/executeTry';

describe('eachApply', () => {
  test('calls each function with given args', () => {
    const calls: number[] = [];
    eachApply([(x: number) => calls.push(x + 1), (x: number) => calls.push(x * 2)], [5]);
    expect(calls).toEqual([6, 10]);
  });

  test('works with object of functions', () => {
    const calls: string[] = [];
    eachApply({
      a: () => calls.push('a'),
      b: () => calls.push('b'), 
    });
    expect(calls.sort()).toEqual(['a', 'b']);
  });

  test('passes context to each function', () => {
    const ctx = {
      value: 42, 
    };
    let received: any;
    eachApply(
      [function(this: any) {
        received = this.value; 
      }], [], ctx,
    );
    expect(received).toBe(42);
  });
});

describe('eachApplyMap', () => {
  test('maps array of functions to results', () => {
    const result = eachApplyMap([(x: number) => x + 1, (x: number) => x * 2], [5]);
    expect(result).toEqual([6, 10]);
  });

  test('maps object of functions to result object', () => {
    const result = eachApplyMap({
      double: (x: number) => x * 2, 
    }, [3]);
    expect(result).toEqual({
      double: 6, 
    });
  });
});

describe('eachTry', () => {
  test('calls each function ignoring errors', () => {
    const result: number[] = [];
    eachTry([
      () => result.push(1),
      () => {
        throw new Error('fail'); 
      },
      () => result.push(3),
    ],
    []);
    expect(result).toEqual([1, 3]);
  });

  test('calls onError for each thrown error', () => {
    const errors: unknown[] = [];
    const err = new Error('oops');
    eachTry(
      [() => {
        throw err; 
      }], [], null, (e) => errors.push(e),
    );
    expect(errors).toEqual([err]);
  });
});

describe('executeTry', () => {
  test('returns function result on success', () => {
    expect(executeTry(() => 42)).toBe(42);
  });

  test('returns undefined when function throws', () => {
    expect(executeTry(() => {
      throw new Error('x'); 
    })).toBeUndefined();
  });

  test('calls onError handler on throw', () => {
    const errors: unknown[] = [];
    const err = new Error('test');
    executeTry(
      () => {
        throw err; 
      }, [], null, (e) => errors.push(e),
    );
    expect(errors).toEqual([err]);
  });

  test('passes args and context to function', () => {
    const ctx = {
      base: 10, 
    };
    const result = executeTry(
      function(this: any, x: number) {
        return this.base + x; 
      }, [5], ctx,
    );
    expect(result).toBe(15);
  });
});
