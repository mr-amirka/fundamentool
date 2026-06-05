/**
 * Normalizes a step value.
 * 
 * @param step - The step value to normalize.
 * @param limit - The limit value to normalize the step value to.
 * @returns The normalized step value.
 * @example
 * normalizeStep('10') // => 10
 * normalizeStep('10', 100) // => 10
 */
export const normalizeStep = (step?: string, limit?: number): number => {
  const value = Math.max(parseInt(step || '1'), 1);
  return limit ? Math.min(value, limit) : value;
};
