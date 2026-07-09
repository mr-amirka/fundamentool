import {
  loop, 
} from '../src/loop';

describe('loop', () => {
  test('calls fn for each index from 0 to length', () => {
    const indices: number[] = [];
    loop(5, i => indices.push(i));
    expect(indices).toEqual([
      0,
      1,
      2,
      3,
      4,
    ]);
  });

  test('starts from custom start index', () => {
    const indices: number[] = [];
    loop(
      5, i => indices.push(i), 2,
    );
    expect(indices).toEqual([
      2,
      3,
      4,
    ]);
  });

  test('does not call fn when length is 0', () => {
    const calls: number[] = [];
    loop(0, i => calls.push(i));
    expect(calls).toEqual([]);
  });
});
