import { toUpper } from '../src/toUpper';

describe('toUpper', () => {
  test('converts to uppercase', () => {
    expect(toUpper('hello')).toBe('HELLO');
    expect(toUpper('aBc')).toBe('ABC');
  });
});
