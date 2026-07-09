import {
  splitProvider, 
} from '../../src/split/splitProvider';

describe('splitProvider', () => {
  test('creates a splitter for a string delimiter', () => {
    const splitDash = splitProvider('-');
    expect(splitDash('a-b-c')).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('creates a splitter for a regex delimiter', () => {
    const splitDigit = splitProvider(/\d/);
    expect(splitDigit('a1b2c')).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('returns single-element array when delimiter not found', () => {
    const splitDash = splitProvider('-');
    expect(splitDash('hello')).toEqual(['hello']);
  });

  test('handles empty string', () => {
    const splitDash = splitProvider('-');
    expect(splitDash('')).toEqual(['']);
  });
});
