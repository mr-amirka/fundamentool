/**
 * Tries to parse a string as JSON.
 * 
 * @param s - The string to parse.
 * @returns Parsed value on success, or the original string on failure.
 * @example
 * tryJsonParse('{"a":1}'); // => { a: 1 }
 * tryJsonParse('not json'); // => 'not json'
 */
export const tryJsonParse = (s: string): any => {
  try {
    return JSON.parse(s);
  } catch (e) {}
  return s;
};
