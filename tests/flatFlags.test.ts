import {
  flatFlags,
} from '../src/flatFlags';

describe('flatFlags', () => {
  test('builds flat flags object', () => {
    expect(flatFlags([
      'a',
      'b',
      'c',
    ])).toEqual({
      a: 1,
      b: 1,
      c: 1,
    });
  });

  test('does not interpret dot-notation as a path (unlike flags)', () => {
    expect(flatFlags(['test.use'])).toEqual({
      'test.use': 1,
    });
  });

  test('does not interpret brackets as a path', () => {
    expect(flatFlags([
      '[type=button]',
      'abbr[title]',
      '.myClass',
    ])).toEqual({
      '[type=button]': 1,
      'abbr[title]': 1,
      '.myClass': 1,
    });
  });

  test('merges into provided dst', () => {
    const dst = {
      x: 1,
    };
    flatFlags(['y'], dst);
    expect(dst).toEqual({
      x: 1,
      y: 1,
    });
  });

  test('empty array returns empty object', () => {
    expect(flatFlags([])).toEqual({});
  });
});
