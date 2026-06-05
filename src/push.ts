/**
 * Pushes additional arguments into array `self`.
 *
 * @param self - The array to push the items into.
 * @param items - The items to push into the array.
 * @returns The array.
 * @example
 * const arr = [1, 2];
 * push(arr, 3, 4); // => [1, 2, 3, 4]
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function push<T>(self: T[], ...items: any[]): T[];
export function push(self: any[]): any[] {
  const l = arguments.length;
  let i = 1;
  for (; i < l; i++) {
    self.push(arguments[i]);
  }
  return self;
}
