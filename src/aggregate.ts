import { eachApply } from './eachApply';

type AnyFn = (...args: any[]) => any;
type Aggregator = (funcs: AnyFn[], args: any[], context: any) => any;

/**
 * Aggregates an array of functions into a single function.
 * 
 * @param funcs - The functions to aggregate.
 * @param aggregator - The aggregator function to use (defaults to `eachApply`).
 * @returns A single function that fans the call out to all `funcs`.
 * @example
 * const notify = aggregate([logFn, metricsFn]);
 * notify('event'); // calls logFn('event') and metricsFn('event')
 */
export const aggregate = <T extends any[]>(
  funcs: AnyFn[],
  aggregator: Aggregator = ((f, a, c) => eachApply(f, a, c)) as Aggregator,
): ((this: any, ..._args: T) => any) => {
  return function aggregated(...args: T): any {
    return aggregator(funcs, args, this);
  };
};
