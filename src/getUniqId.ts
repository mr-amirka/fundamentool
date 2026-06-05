let LAST_INDEX = 0;

/**
 * Generates an incrementing unique id, optionally prefixed.
 *
 * @param prefix - Optional prefix for the id.
 * @returns A string unique within the current process lifetime.
 * @example
 * getUniqId();        // => '0', '1', '2', …
 * getUniqId('item-'); // => 'item-3', 'item-4', …
 */
export const getUniqId = (prefix?: string): string => `${prefix || ''}${LAST_INDEX++}`;
