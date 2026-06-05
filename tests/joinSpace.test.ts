import { joinSpace } from '../src/join/joinSpace';

describe('joinSpace', () => {
  test('joins with space', () => {
    expect(joinSpace(['a', 'b', 'c'])).toBe('a b c');
  });

  test('empty array', () => {
    expect(joinSpace([])).toBe('');
  });
});
