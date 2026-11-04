import {
  applyEdits,
} from '../../src/source';
import type {
  TSourceEdit,
} from '../../src/source';

describe('applyEdits', () => {
  test('an insertion', () => {
    expect(applyEdits('<b class="p">', [
      [
        10,
        10,
        '_l ',
      ],
    ])).toBe('<b class="_l p">');
  });

  test('positions are the original\'s, whatever the order given', () => {
    expect(applyEdits('a b c', [
      [
        4,
        5,
        'C',
      ],
      [
        0,
        1,
        'A',
      ],
    ])).toBe('A b C');
    expect(applyEdits('a b c', [
      [
        0,
        1,
        'A',
      ],
      [
        4,
        5,
        'C',
      ],
    ])).toBe('A b C');
  });

  test('a replacement may change the length', () => {
    expect(applyEdits('x = y;', [
      [
        4,
        5,
        '"_l " + ((y) || "")',
      ],
    ])).toBe('x = "_l " + ((y) || "");');
  });

  test('insertions at one point go in the order given', () => {
    expect(applyEdits('ab', [
      [
        1,
        1,
        '1',
      ],
      [
        1,
        1,
        '2',
      ],
    ])).toBe('a12b');
  });

  test('edits that touch don\'t overlap', () => {
    expect(applyEdits('abcd', [
      [
        1,
        2,
        'B',
      ],
      [
        2,
        3,
        'C',
      ],
    ])).toBe('aBCd');
    expect(applyEdits('abcd', [
      [
        1,
        2,
        'B',
      ],
      [
        2,
        2,
        '+',
      ],
    ])).toBe('aB+cd');
  });

  test('no edits — the text itself', () => {
    const source = 'abc';
    expect(applyEdits(source, [])).toBe(source);
  });

  test.each([
    [
      [
        [
          0,
          2,
          'x',
        ],
        [
          1,
          3,
          'y',
        ],
      ],
    ],
    [
      [
        [
          1,
          3,
          'x',
        ],
        [
          1,
          3,
          'y',
        ],
      ],
    ],
    [
      [
        [
          1,
          1,
          'x',
        ],
        [
          1,
          3,
          'y',
        ],
      ],
    ],
    [
      [
        [
          1,
          3,
          'x',
        ],
        [
          1,
          1,
          'y',
        ],
      ],
    ],
  ])('%j overlap — an error in development', (edits) => {
    expect(() => applyEdits('abcd', edits as TSourceEdit[])).toThrow(RangeError);
    expect(() => applyEdits('abcd', edits as TSourceEdit[])).toThrow('[fundamentool/source] applyEdits: edits overlap');
  });
});
