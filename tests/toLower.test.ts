import { toLower } from '../src/toLower';

describe('toLower', () => {
  test('converts to lowercase', () => {
    expect(toLower('HELLO')).toBe('hello');
    expect(toLower('AbC')).toBe('abc');
  });
});
