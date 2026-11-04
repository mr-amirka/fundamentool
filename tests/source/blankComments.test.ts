import {
  blankComments,
  blankSpan,
} from '../../src/source';

describe('blankComments', () => {
  test.each([
    [
      'a /* x */ b',
      'a         b',
    ],
    [
      'a // x\nb',
      'a     \nb',
    ],
    [
      '<b/><!-- <i class="p1"> --><u/>',
      '<b/>                       <u/>',
    ],
    [
      '{/* x */}<b/>',
      '{       }<b/>',
    ],
    [
      '/* a\nb */c',
      '    \n    c',
    ],
    [
      'a / b < c',
      'a / b < c',
    ],
    [
      '<!- x',
      '<!- x',
    ],
  ])('%j → %j', (source, expected) => {
    expect(blankComments(source)).toBe(expected);
  });

  test('the length and the lines are kept', () => {
    const source = 'x /* one\ntwo */ y // three\n<!-- four\nfive --> z';
    const blanked = blankComments(source);
    expect(blanked.length).toBe(source.length);
    expect(blanked.split('\n').length).toBe(source.split('\n').length);
    expect(blanked.indexOf('z')).toBe(source.indexOf('z'));
  });

  test('a string is skipped whole: no comment inside it', () => {
    expect(blankComments("url('https://x') // y")).toBe("url('https://x')     ");
    expect(blankComments('"/* a */" `// b` \'<!-- c -->\'')).toBe('"/* a */" `// b` \'<!-- c -->\'');
    expect(blankComments("'a\\' // b' c")).toBe("'a\\' // b' c");
  });

  test('with no comment the text itself comes back', () => {
    const source = 'const a = "b";';
    expect(blankComments(source)).toBe(source);
  });

  test('a comment not closed runs to the end', () => {
    expect(blankComments('a /* b')).toBe('a     ');
    expect(blankComments('a <!-- b')).toBe('a       ');
    expect(blankComments('a /*')).toBe('a   ');
    expect(blankComments('"a')).toBe('"a');
  });

  test('onComment reads each comment before it is blanked, in order, with its range', () => {
    const source = 'a /* one */ b // two\n<!-- three -->';
    const seen: string[] = [];
    const blanked = blankComments(
      source, seen, (
        out, text, from, to,
      ) => {
        out.push(text.slice(from, to));
      },
    );
    expect(seen).toEqual([
      '/* one */',
      '// two',
      '<!-- three -->',
    ]);
    expect(blanked).toBe('a           b       \n              ');
  });
});

describe('blankSpan', () => {
  test('a range longer than any before it', () => {
    const long = 'x'.repeat(1000);
    expect(blankSpan(
      long, 0, 1000,
    )).toBe(' '.repeat(1000));
    expect(blankSpan(
      long, 0, 3,
    )).toBe('   ');
  });

  test.each([
    [
      'abc',
      0,
      3,
      '   ',
    ],
    [
      'a\nb',
      0,
      3,
      ' \n ',
    ],
    [
      'a\n\nb',
      0,
      4,
      ' \n\n ',
    ],
    [
      'ab\ncd',
      3,
      5,
      '  ',
    ],
    [
      'ab\ncd',
      1,
      3,
      ' \n',
    ],
    [
      'abc',
      1,
      1,
      '',
    ],
  ])('%j [%i, %i) → %j', (
    source, from, to, expected,
  ) => {
    expect(blankSpan(
      source, from, to,
    )).toBe(expected);
  });
});
