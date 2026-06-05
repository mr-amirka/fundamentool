/**
 * Picks keys from `input` into `output`.
 * Optionally fills `outOther` with the rest.
 * 
 * @param input - The input object to pick keys from.
 * @param keys - The keys to pick.
 * @param output - The output object to write into.
 * @param outOther - The object to write the rest into.
 * @returns The picked object.
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // => { a: 1, c: 3 }
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c'], {}, { b: 2, c: 3 }); // => { a: 1, c: 3 }
 */
export const pick = (
  input: Record<string, any> | null | undefined,
  keys: Array<string | number>,
  output?: Record<string, any>,
  outOther?: Record<string, any>,
): Record<string, any> => {
  const dst: Record<string, any> = output || {};
  const dstOther: Record<string, any> = outOther || {};
  if (!input) return dst;

  let v: any;
  let k: string;

  for (k in input) {
    v = input[k];
    v === undefined || ((keys.includes(k) ? dst : dstOther)[k] = v);
  }

  return dst;
};

