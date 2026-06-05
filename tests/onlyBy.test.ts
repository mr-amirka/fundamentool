import { onlyBy, onlyByIn } from '../src/onlyBy';

describe('onlyBy', () => {
  test('returns item with max iteratee value by default (byMin comparator)', () => {
    // default compare is byMin — returns item with smallest iteratee value
    const result = onlyBy([3, 1, 2], (v) => v);
    expect(result).toBe(1);
  });

  test('returns item with max value using byMax comparator (true)', () => {
    const result = onlyBy([3, 1, 2], (v) => v, true);
    expect(result).toBe(3);
  });

  test('uses custom comparator', () => {
    const result = onlyBy([3, 1, 2], (v) => v, (a, b) => a > b);
    expect(result).toBe(3);
  });

  test('works with objects', () => {
    const users = [{ age: 30 }, { age: 20 }, { age: 25 }];
    const youngest = onlyBy(users, (u) => u.age, false);
    expect(youngest).toEqual({ age: 20 });
  });

  test('returns undefined for empty array', () => {
    expect(onlyBy([], (v) => v)).toBeUndefined();
  });
});

describe('onlyByIn', () => {
  test('returns value with min iteratee result by default', () => {
    const result = onlyByIn({ a: 3, b: 1, c: 2 }, (v) => v);
    expect(result).toBe(1);
  });

  test('returns value with max iteratee result using true', () => {
    const result = onlyByIn({ a: 3, b: 1, c: 2 }, (v) => v, true);
    expect(result).toBe(3);
  });
});
