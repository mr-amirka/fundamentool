/**
 * Flattens nested structures into plain dotted paths.
 *
 * @param params - The parameters to flatten.
 * @returns The flattened parameters.
 * @example
 * toPlainFields({ a: { b: 1 }, list: ['x', 'y'] })
 * // => { 'a.b': 1, 'list.0': 'x', 'list.1': 'y' }
 */
export const toPlainFields = (params: any): Record<string, any> => {
  const output: Record<string, any> = {};

  function base(prefix: string, value: any): void {
    if (!value || typeof value !== 'object') {
      output[prefix] = value;
      return;
    }

    const nextPrefix = prefix ? prefix + '.' : '';

    if (value instanceof Array) {
      for (let i = 0, l = value.length; i < l; i++) {
        base(nextPrefix + i, value[i]);
      }
      return;
    }

    // eslint-disable-next-line guard-for-in
    for (const k in value) {
      base(nextPrefix + k, (value as any)[k]);
    }
  }

  base('', params);

  return output;
};

