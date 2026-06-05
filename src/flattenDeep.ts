import { isArray } from './is/isArray';

/**
 * Flattens nested arrays into a single‑level array.
 *
 * Uses an explicit stack to avoid recursion.
 * 
 * @param input - The array to flatten.
 * @returns The flattened array.
 * @example
 * flattenDeep([1, [2, [3, [4]]]]); // => [1, 2, 3, 4]
 */
export const flattenDeep = <T = any>(input: any[]): T[] => {
  const output: T[] = [];
  const stack: Array<[any[], number]> = [];
  let stackItem: [any[], number] | undefined = [input, 0];
  let item: any;
  let offset: number;
  let length: number;

  while (stackItem) {
    input = stackItem[0];
    offset = stackItem[1];
    length = input.length;
    while (offset < length) {
      item = input[offset];
      if (isArray(item)) {
        stack.push([input, offset + 1]);
        input = item;
        offset = 0;
        length = input.length;
        continue;
      }
      output.push(item);
      offset++;
    }
    stackItem = stack.pop();
  }

  return output;
};

