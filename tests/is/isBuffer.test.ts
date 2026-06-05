import { isBuffer } from '../../src/is/isBuffer';

describe('isBuffer', () => {
  test('returns true for Buffer instances', () => {
    expect(isBuffer(Buffer.from('data'))).toBe(true);
    expect(isBuffer(Buffer.alloc(0))).toBe(true);
  });

  test('returns false for non-Buffer values', () => {
    expect(isBuffer('data')).toBe(false);
    expect(isBuffer(new Uint8Array())).toBe(false);
    expect(isBuffer(null)).toBe(false);
    expect(isBuffer(undefined)).toBe(false);
    expect(isBuffer({})).toBe(false);
  });
});
