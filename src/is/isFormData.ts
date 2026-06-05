import { providerOfIsClass } from '../providerOfIsClass';

/**
 * Checks whether value is a FormData instance.
 *
 * @param v - The value to check.
 * @returns `true` if value is a FormData instance.
 * @example
 * isFormData(new FormData()); // => true
 * isFormData({});             // => false
 */
export const isFormData = providerOfIsClass(() => FormData);