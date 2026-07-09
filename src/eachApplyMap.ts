import {
  map, 
} from './map';
import {
  mapIn, 
} from './mapIn';
import {
  isArrayLike, 
} from './is/isArrayLike';

type TFn = (...args: any[]) => any;

/**
 * Applies all functions from `fns` and returns mapped results
 * (array for array‑like input, object otherwise).
 * 
 * @param fns - The functions to apply.
 * @param args - The arguments to pass to the functions.
 * @param ctx - The context to pass to the functions.
 * @returns The mapped array or object.
 * @example
 * eachApplyMap([x => x + 1, x => x * 2], [5]); // => [6, 10]
 */
export const eachApplyMap = <T extends TFn[] | Record<string, TFn>, R = any>(
  fns: T,
  args?: any[],
  ctx?: any,
): R[] | Record<string, R> => {
  const context = ctx || null;
  const callArgs = args || [];
  const isArrayTarget = isArrayLike(fns);
  return (isArrayTarget ? map : mapIn as any)(
    fns,
    (fn: TFn) => fn.apply(context, callArgs),
    isArrayTarget ? [] : {},
  );
};

