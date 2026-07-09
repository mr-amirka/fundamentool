import {
  unslash, 
} from '../src/unslash';

describe('unslash', () => {
  test('unescapes backslash', () => {
    expect(unslash('a\\\\b')).toBe('a\\b');
  });

  test('pipe escape in variants style', () => {
    expect(unslash('h\\|ello')).toBe('h|ello');
  });

  test('empty string', () => {
    expect(unslash('')).toBe('');
  });
});
