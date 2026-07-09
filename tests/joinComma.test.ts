import {
  joinComma, 
} from '../src/join/joinComma';

describe('joinComma', () => {
  test('joins with comma', () => {
    expect(joinComma([
      1,
      2,
      3,
    ])).toBe('1,2,3');
    expect(joinComma(['a', 'b'])).toBe('a,b');
  });

  test('single element', () => {
    expect(joinComma([1])).toBe('1');
  });

  test('empty array', () => {
    expect(joinComma([])).toBe('');
  });
});
