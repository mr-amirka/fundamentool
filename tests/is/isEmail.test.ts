import {
  isEmail, 
} from '../../src/is/isEmail';

describe('isEmail', () => {
  test('returns true for valid emails', () => {
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail('user.name@domain.co.uk')).toBe(true);
    expect(isEmail('user+42@example.com')).toBe(true);
    expect(isEmail('USER@EXAMPLE.COM')).toBe(true);
  });

  test('returns false for invalid emails', () => {
    expect(isEmail('not-an-email')).toBe(false);
    expect(isEmail('missing@tld')).toBe(false);
    expect(isEmail('@no-local.com')).toBe(false);
    expect(isEmail('')).toBe(false);
    expect(isEmail(null)).toBe(false);
    expect(isEmail(undefined)).toBe(false);
  });
});
