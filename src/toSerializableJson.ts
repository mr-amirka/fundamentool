/**
 * Converts a value to a JSON‑compatible value.
 *
 * - Functions and `undefined` are converted to `null`
 * - Objects and arrays are copied recursively
 * - Cyclic references are converted to `null`
 *
 * @param value - The value to convert.
 * @returns The JSON‑compatible value.
 * @example
 * const src = { fn: () => {}, value: 1 };
 * const safe = toSerializableJson(src);
 * // safe: { fn: null, value: 1 }
 */
export const toSerializableJson = (value: any): any => {
  return toSerializableJsonBase(value, []);
};

/**
 * Converts a value to a JSON‑compatible value.
 *
 * @param value - The value to convert.
 * @param excludes - The values to exclude from the conversion.
 * @returns The JSON‑compatible value.
 */
export const toSerializableJsonBase = (value: any, excludes: any[]): any => {
  const t = typeof value;

  if (value === undefined || t === 'function') {
    return null;
  }

  if (!value || t !== 'object') {
    return value;
  }

  if (excludes.indexOf(value) > -1) {
    return null;
  }

  const nextExcludes = [...excludes, value];

  if (Array.isArray(value)) {
    const length = value.length;
    const output = new Array(length);
    for (let i = 0; i < length; i++) {
      output[i] = toSerializableJsonBase(value[i], nextExcludes);
    }
    return output;
  }

  const output: Record<string, any> = {};
  // eslint-disable-next-line guard-for-in
  for (const key in value) {
    output[key] = toSerializableJsonBase(value[key], nextExcludes);
  }

  return output;
};

