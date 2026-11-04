import {
  childCombinator,
} from '../../src/css';

describe('childCombinator', () => {
  test.each([
    [
      0,
      '',
    ],
    [
      -1,
      '',
    ],
    [
      1,
      '>',
    ],
    [
      2,
      '>*>',
    ],
    [
      3,
      '>*>*>',
    ],
  ])('%i → %j', (depth, expected) => {
    expect(childCombinator(depth)).toBe(expected);
  });
});
