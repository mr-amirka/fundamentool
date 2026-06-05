/**
 * Validates an email address using a project-specific regexp.
 *
 * @param v - The value to validate.
 * @returns `true` if value is a valid email address under 255 characters.
 * @example
 * isEmail('user@example.com'); // => true
 * isEmail('not-an-email');     // => false
 * isEmail('');                 // => false
 */
export const isEmail = (v: string | null | undefined): boolean => {
  return !!(
    v &&
    v.length < 255 &&
    /^[_a-z0-9-]+(\.[_a-z0-9-]+)*(\+[0-9]+)?@[a-z0-9-]+(\.[a-z0-9-]{2,})+$/i.exec(v)
  );
};

