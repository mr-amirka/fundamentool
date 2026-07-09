import {
  isFormData, 
} from '../../src/is/isFormData';

describe('isFormData', () => {
  test('returns true for FormData instances when FormData is available', () => {
    if (typeof FormData === 'undefined') {
      return;
    }
    expect(isFormData(new FormData())).toBe(true);
  });

  test('returns false for non-FormData values', () => {
    expect(isFormData({})).toBe(false);
    expect(isFormData(null)).toBe(false);
    expect(isFormData(undefined)).toBe(false);
    expect(isFormData('data')).toBe(false);
  });
});
