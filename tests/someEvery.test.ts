import {
  some, 
} from '../src/some';
import {
  someIn, 
} from '../src/someIn';
import {
  every, 
} from '../src/every';
import {
  everyIn, 
} from '../src/everyIn';

describe('some', () => {
  test('returns true when at least one element matches', () => {
    expect(some([
      1,
      2,
      3,
    ], (v) => v === 2)).toBe(true);
  });

  test('returns false when no element matches', () => {
    expect(some([
      1,
      2,
      3,
    ], (v) => v === 99)).toBe(false);
  });

  test('returns false for empty array', () => {
    expect(some([], () => true)).toBe(false);
  });

  test('stops at first match', () => {
    const calls: number[] = [];
    some([
      1,
      2,
      3,
    ], (v) => {
      calls.push(v); return v === 1; 
    });
    expect(calls).toEqual([1]);
  });
});

describe('someIn', () => {
  test('returns true when at least one value matches', () => {
    expect(someIn({
      a: 1,
      b: 2, 
    }, (v) => v === 2)).toBe(true);
  });

  test('returns false when no value matches', () => {
    expect(someIn({
      a: 1, 
    }, (v) => v === 99)).toBe(false);
  });
});

describe('every', () => {
  test('returns true when all elements match', () => {
    expect(every([
      2,
      4,
      6,
    ], (v) => v % 2 === 0)).toBe(true);
  });

  test('returns false when any element does not match', () => {
    expect(every([
      2,
      3,
      6,
    ], (v) => v % 2 === 0)).toBe(false);
  });

  test('returns true for empty array', () => {
    expect(every([], () => false)).toBe(true);
  });

  test('stops at first non-match', () => {
    const calls: number[] = [];
    every([
      1,
      2,
      3,
    ], (v) => {
      calls.push(v); return v < 2; 
    });
    expect(calls).toEqual([1, 2]);
  });
});

describe('everyIn', () => {
  test('returns true when all values match', () => {
    expect(everyIn({
      a: 2,
      b: 4, 
    }, (v) => v % 2 === 0)).toBe(true);
  });

  test('returns false when any value does not match', () => {
    expect(everyIn({
      a: 2,
      b: 3, 
    }, (v) => v % 2 === 0)).toBe(false);
  });
});
