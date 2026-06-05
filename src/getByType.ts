/**
 * Maps arguments by their `typeof` according to `typesMap`.
 *
 * `typesMap` key = `typeof` string; value = ordered list of output key names assigned to successive matching args.
 *
 * @param args - The arguments to map.
 * @param typesMap - Map of typeof → output key names.
 * @param dst - The destination object.
 * @returns The mapped object.
 * @example
 * getByType(['hello', 42], { string: ['s'], number: ['n'] });
 * // => { s: 'hello', n: 42 }
 */
export const getByType = (
  args: any[],
  typesMap: Record<string, string[]>,
  dst?: Record<string, any>,
): Record<string, any> => {
  const out: Record<string, any> = dst || {};
  const tmp: Record<string, string[]> = {};

  // clone and reverse arrays so that last match wins
  let k: keyof typeof typesMap;
  for (k in typesMap) {
    tmp[k] = typesMap[k].slice().reverse();
  }

  const l = args.length;
  let i = 0;
  let v: any;
  let keys: string[];
  for (; i < l; i++) {
    v = args[i];
    keys = tmp[typeof v];
    if (keys && keys.length) {
      out[keys.pop() as string] = v;
    }
  }

  return out;
};

