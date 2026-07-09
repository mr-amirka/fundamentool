import {
  sortBy, 
} from '../src/sortBy';

describe('sortBy', () => {
  test('sorts by computed string key', () => {
    const input = [
      {
        name: 'Zara', 
      },
      {
        name: 'Alice', 
      },
      {
        name: 'Bob', 
      },
    ];
    const result = sortBy(input, u => u.name.toLowerCase());
    expect(result.map(u => u.name)).toEqual([
      'Alice',
      'Bob',
      'Zara',
    ]);
  });

  test('sorts by numeric value', () => {
    const input = [
      {
        v: 3, 
      },
      {
        v: 1, 
      },
      {
        v: 2, 
      },
    ];
    expect(sortBy(input, u => u.v).map(u => u.v)).toEqual([
      1,
      2,
      3,
    ]);
  });

  test('handles empty array', () => {
    expect(sortBy([], u => u)).toEqual([]);
  });

  test('is stable for equal keys', () => {
    const input = [{
      n: 'a',
      i: 0, 
    }, {
      n: 'a',
      i: 1, 
    }];
    const result = sortBy(input, u => u.n);
    expect(result[0].i).toBe(0);
  });
});
