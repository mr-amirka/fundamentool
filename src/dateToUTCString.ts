/**
 * Normalizes a time part.
 * 
 * @param n - The time part to normalize.
 * @returns The normalized time part.
 */
export const normalizeTimePart = (n: number): string => n < 10 ? `0${n}` : `${n}`;


/**
 * Converts a date to a UTC string.
 * 
 * @param time - The date to convert.
 * @returns The UTC string.
 * @example
 * dateToUTCString(new Date('2024-01-15T12:30:00Z')); // => '20240115T123000Z'
 */
export const dateToUTCString = (time: number | Date): string => {
  const d = new Date(time);

  return (
    d.getUTCFullYear() +
    normalizeTimePart(d.getUTCMonth() + 1) +
    normalizeTimePart(d.getUTCDate()) +
    'T' +
    normalizeTimePart(d.getUTCHours()) +
    normalizeTimePart(d.getUTCMinutes()) +
    normalizeTimePart(d.getUTCSeconds()) +
    'Z'
  );
};
