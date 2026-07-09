import {
  entries, 
} from '../src/entries';

describe('entries', () => {
  test('returns key-value pairs', () => {
    expect(entries({
      a: 1,
      b: 2, 
    })).toEqual([['a', 1], ['b', 2]]);
  });

  test('empty object', () => {
    expect(entries({})).toEqual([]);
  });
});
