const REGEXP_STRIP_TAGS = /(<[A-Za-z0-9]+('[^']+'|"[^"]+"|[^>])*\/?>|<\/[A-Za-z0-9]+>)/g;
const REGEXP_SPACE = /\s+/g;
const REGEXP_TRIM = /^\s+|\s+$/g;

function replaceOnce(
  v: string, from: RegExp, to: string,
): string {
  return v.replace(from, to);
}

/**
 * Strips HTML tags and normalizes whitespace into single spaces.
 * 
 * @param v - The string to strip tags from.
 * @returns The stripped string.
 * @example
 * stripTags('<p>Hello <b>world</b></p>'); // => 'Hello world'
 */
export const stripTags = (v: string): string =>
  v &&
  replaceOnce(
    replaceOnce(
      replaceOnce(
        v, REGEXP_STRIP_TAGS, ' ',
      ), REGEXP_SPACE, '',
    ),
    REGEXP_TRIM,
    '',
  );
