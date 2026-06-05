const REGEXP_PHONE = /^\+7\(\d{3}\)\d{3}-\d{2}-\d{2}$/i;

/**
 * Validates a Russian phone number in the format `+7(XXX)XXX-XX-XX`.
 *
 * @param v - The value to validate.
 * @returns `true` if value matches the expected phone format.
 * @example
 * isPhone('+7(999)123-45-67'); // => true
 * isPhone('89991234567');      // => false
 */
export const isPhone = (v: string | null | undefined): boolean =>
  !!v && REGEXP_PHONE.test(v);

