import {
  wrapper, 
} from '../src/wrapper';
import {
  aggregate, 
} from '../src/aggregate';

describe('wrapper', () => {
  test('wraps value into zero-arg function', () => {
    const fn = wrapper(42);
    expect(fn()).toBe(42);
  });
});

describe('aggregate', () => {
  test('aggregates functions and delegates to aggregator', () => {
    const calls: any[] = [];
    const f1 = jest.fn((x: number) => x + 1);
    const f2 = jest.fn((x: number) => x * 2);

    const aggregator = (
      funcs: Array<(x: number) => number>, args: any[], ctx: any,
    ) => {
      calls.push({
        funcs: funcs.length,
        args: [...args],
        ctx, 
      });
      return funcs.map((fn) => fn.apply(ctx, args));
    };

    const aggrFn = aggregate<[number]>([f1, f2], aggregator as any);

    const result = aggrFn.call({
      ctx: true, 
    }, 10) as number[];

    expect(result).toEqual([11, 20]);
    expect(calls).toHaveLength(1);
    expect(calls[0].funcs).toBe(2);
    expect(calls[0].args).toEqual([10]);
    expect(calls[0].ctx).toEqual({
      ctx: true, 
    });
  });
});
