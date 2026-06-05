const re = /(\\\\)|(\\)/g;

function replacer(all: string, v: string): string {
  return v ? '\\' : '';
}

/**
 * Normalizes backslash escaping:
 * - `\\\\` → `\\`
 * - `\\` → empty string (removes the escape)
 *
 * @param v - The string to process.
 * @returns String with backslash sequences resolved.
 * @example
 * unslash('hello\\ world'); // => 'hello world'
 */
export const unslash = (v: string): string => v.replace(re, replacer);

