/**
 * Converts a string to a break line HTML.
 * 
 * @param input - The string to convert.
 * @returns The converted string.
 * @example
 * convertToBreakLineHTML('line1\nline2');
 * // => '<span>line1</span><span><br/>line2</span>'
 */
export const convertToBreakLineHTML = (input: string): string => {
  return input
    .split('\n')
    .map((value, index) => {
      value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return index ? (value ? `<span><br/>${value}</span>` : '<br/>') : `<span>${value}</span>`;
    })
    .join('');
};
