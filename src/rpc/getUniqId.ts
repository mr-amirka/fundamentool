let LAST_INDEX = 0;

/**
 * Generates a unique string ID based on a counter, timestamp, and random suffix.
 *
 * @returns A unique string identifier.
 * @example
 * getUniqId(); // => '000110abc2xz'
 */
export function getUniqId() {
  return `${(++LAST_INDEX).toString(36).padStart(4, '0')}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
}