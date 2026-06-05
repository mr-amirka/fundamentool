/**
 * Combines an array of template-part render functions into a single render function.
 *
 * Each part receives `scope` and returns a string fragment; the results are
 * concatenated in order.
 *
 * @param parts - Array of render functions produced by `templateProvider`.
 * @returns A single render function `(scope) => string`.
 * @example
 * const render = templatePartsJoin([() => 'Hello, ', (s) => s.name]);
 * render({ name: 'World' }); // => 'Hello, World'
 */
export const templatePartsJoin = (parts: ((scope: Record<string, any>) => any)[]) => {
  return (scope: Record<string, any>) => parts.map((v) => v(scope)).join('');
};
