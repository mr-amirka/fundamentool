import {
  STRING_PLACES,
  sourceStringsProvider,
} from '../../src/source';
import type {
  TStringPlaces,
} from '../../src/source';

const push = (out: string[], text: string): void => {
  out.push(text);
};

/** The strings of a text at these places. */
function stringsOf(places: TStringPlaces, source: string): string[] {
  const out: string[] = [];
  sourceStringsProvider(places)(
    source, out, push,
  );
  return out;
}

describe('sourceStringsProvider — attrs', () => {
  const attrs = (source: string, names: string[] = ['class']) => stringsOf({
    attrs: names,
  }, source);

  test.each([
    [
      '<div class="p10 w50">',
      ['p10 w50'],
    ],
    [
      "<div class='p10'>",
      ['p10'],
    ],
    [
      "<div class={'p10'}>",
      ['p10'],
    ],
    [
      '<div class={ "p10" }>',
      ['p10'],
    ],
    [
      '<div class={`p10 ${on ? \'cF\' : \'c0\'} w5`}>',
      [
        'p10 ',
        'cF',
        'c0',
        ' w5',
      ],
    ],
    [
      "<div class={on ? 'a' : 'b'}>",
      [
        'a',
        'b',
      ],
    ],
    [
      "<div class={v === 'x' ? 'a' : 'b'}>",
      [
        'a',
        'b',
      ],
    ],
    [
      "{ class: 'p10' }",
      ['p10'],
    ],
    [
      "{ class: on && 'a' }",
      ['a'],
    ],
    [
      '<div class="">',
      [''],
    ],
    [
      '<div class=x>',
      [],
    ],
    [
      '<div data-class="p10">',
      [],
    ],
    [
      '<div klass="p10">',
      [],
    ],
  ])('%s → %j', (source, expected) => {
    expect(attrs(source)).toEqual(expected);
  });

  test('nested object keys (MUI slotProps)', () => {
    expect(attrs("slotProps={{ paper: { className: 'w320 dF' } }}", ['className'])).toEqual(['w320 dF']);
  });

  test('markup inside a string is read: the text is read as it is', () => {
    expect(attrs('html`<div class="p10">`')).toEqual(['p10']);
  });

  test('a pattern takes any name with its ending; case as written', () => {
    expect(attrs('<b fillClassName="a" ClassName="b" classname="c" className="d" />', ['*ClassName'])).toEqual(['a']);
  });

  test('every name, in the order of the names', () => {
    expect(attrs('<b className="b" class="a" />', [
      'class',
      'className',
    ])).toEqual([
      'a',
      'b',
    ]);
  });

  test('a reader serves many files: each starts from the beginning', () => {
    const strings = sourceStringsProvider({
      attrs: ['class'],
    });
    const first: string[] = [];
    const second: string[] = [];
    strings(
      '<a class="x">', first, push,
    );
    strings(
      '<a class="y">', second, push,
    );
    expect(first).toEqual(['x']);
    expect(second).toEqual(['y']);
  });
});

describe('sourceStringsProvider — variables', () => {
  const variables = (source: string, names: string[] = ['*Class']) => stringsOf({
    variables: names,
  }, source);

  test.each([
    [
      "const rowClass = 'p10'",
      ['p10'],
    ],
    [
      'const rowClass = "p10"',
      ['p10'],
    ],
    [
      'let rowClass = `p10 ${x}`',
      [
        'p10 ',
        '',
      ],
    ],
    [
      "const rowClass: string = 'p10'",
      ['p10'],
    ],
    [
      "{ rowClass: 'p10' }",
      ['p10'],
    ],
    [
      '{ rowClass: "p10" }',
      ['p10'],
    ],
    [
      '{ rowClass: `p10` }',
      ['p10'],
    ],
    [
      "{ rowClass: on ? 'a' : 'b' }",
      [
        'a',
        'b',
      ],
    ],
    [
      "const rowClass = on ? 'a' : 'b'",
      [
        'a',
        'b',
      ],
    ],
    [
      "const thClassy = 'p10'",
      [],
    ],
    [
      "const Class = 'p10'",
      [],
    ],
    [
      'const rowClass = x',
      [],
    ],
    [
      "rowClass === 'a'",
      [],
    ],
    [
      "rowClass => 'a'",
      [],
    ],
    [
      "rowClass + 'a'",
      [],
    ],
    [
      "const rowClass: string\n= 'a'",
      [],
    ],
    [
      'const rowClass: string;',
      [],
    ],
    [
      "const rowClass = 'p10",
      ['p10'],
    ],
    [
      'rowClass',
      [],
    ],
    [
      "const rowClass = 'a\\'b'",
      ["a\\'b"],
    ],
  ])('%s → %j', (source, expected) => {
    expect(variables(source)).toEqual(expected);
  });

  test('an exact name is whole: another start or end gives nothing', () => {
    expect(variables("my_rowStyles = 'a'; rowStyles = 'b'; rowStyles2 = 'c'", ['rowStyles'])).toEqual(['b']);
  });

  test('several in one file', () => {
    expect(variables("const aClass = 'a';\nconst bClass = 'b';")).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('sourceStringsProvider — calls', () => {
  const calls = (source: string, names: string[] = [
    'mne',
    '*Class',
  ]) => stringsOf({
    calls: names,
  }, source);

  test.each([
    [
      "mne(base, 'p10')",
      ['p10'],
    ],
    [
      "mne('a', 'b')",
      [
        'a',
        'b',
      ],
    ],
    [
      "mne(x, cond ? 'a' : mne(y, 'p10'))",
      [
        'a',
        'p10',
      ],
    ],
    [
      "mne({ a: 'x' }, ['y'], 'z')",
      [
        'x',
        'y',
        'z',
      ],
    ],
    [
      "mne(`a ${on ? 'b' : 'c'}`)",
      [
        'a ',
        'b',
        'c',
        '',
      ],
    ],
    [
      "mne('a\\'b')",
      ["a\\'b"],
    ],
    [
      "mne\n  ('a')",
      ['a'],
    ],
    [
      "thClass('w150')",
      ['w150'],
    ],
    [
      "Class('w150')",
      [],
    ],
    [
      "myMne('a')",
      [],
    ],
    [
      "obj.mne('a')",
      [],
    ],
    [
      "mne2('a')",
      [],
    ],
    [
      "mne 'a'",
      [],
    ],
    [
      "mne('a'",
      ['a'],
    ],
    [
      "mne('a') + mne('b')",
      [
        'a',
        'b',
      ],
    ],
  ])('%s → %j', (source, expected) => {
    expect(calls(source)).toEqual(expected);
  });

  test('the calls are read in the order of the text, whatever the order of the names', () => {
    expect(calls("thClass('a'); mne('b'); xClass('c')", [
      '*Class',
      'mne',
    ])).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('a call inside another is read once, as a part of it', () => {
    expect(calls("mne(thClass('a'), 'b'); thClass('c')")).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('sourceStringsProvider — the places together', () => {
  test('all of attrs, then variables, then calls', () => {
    expect(stringsOf({
      attrs: ['class'],
      variables: ['*Class'],
      calls: ['mne'],
    }, "mne('c'); const aClass = 'b'; <b class=\"a\" />")).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('a place left out or empty is not read', () => {
    expect(stringsOf({}, "<b class=\"a\" /> const aClass = 'b'; mne('c')")).toEqual([]);
    expect(stringsOf({
      attrs: [],
      variables: [],
      calls: [],
    }, '<b class="a" />')).toEqual([]);
  });

  test('the comments are the caller\'s: the text is read as it is', () => {
    expect(stringsOf({
      attrs: ['class'],
    }, '// <b class="a" />')).toEqual(['a']);
  });
});

describe('sourceStringsProvider — the options, in development', () => {
  test.each([
    [
      {
        atrs: ['class'],
      },
      'unknown option "atrs"',
    ],
    [
      {
        attrs: 'class',
      },
      'attrs',
    ],
    [
      {
        attrs: [''],
      },
      'expects a name or a pattern "*Ending", got an empty string',
    ],
    [
      {
        calls: ['*'],
      },
      'expects a pattern with an ending after "*", as "*Class", got "*"',
    ],
    [
      {
        variables: [1],
      },
      'variables',
    ],
  ])('%j → an error naming it', (places, message) => {
    expect(() => sourceStringsProvider(places as unknown as TStringPlaces)).toThrow(message);
  });

  test('the keys of the places', () => {
    expect(STRING_PLACES().keys).toEqual([
      'attrs',
      'variables',
      'calls',
    ]);
  });
});

/** The finder of calls as one regular expression: the reference the reader by hand agrees with. */
function referenceCalls(source: string, names: string[]): string[] {
  const out: string[] = [];
  const re = new RegExp('(?<![\\w$.])(?:' + names.map((n) => (n[0] === '*'
    ? '[\\w$]+' + n.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('|') + ')(?![\\w$])\\s*\\(', 'g');
  const l = source.length;
  let i = 0;
  while (re.exec(source) !== null) {
    i = re.lastIndex - 1;
    let depth = 0;
    for (; i < l; i++) {
      const ch = source[i];
      if (ch === '(' || ch === '[' || ch === '{') {
        depth++;
        continue;
      }
      if (ch === ')' || ch === ']' || ch === '}') {
        if (!--depth) {
          break;
        }
        continue;
      }
      if (ch !== '\'' && ch !== '"') {
        continue;
      }
      const from = ++i;
      for (; i < l; i++) {
        if (source[i] === '\\') {
          i++;
          continue;
        }
        if (source[i] === ch) {
          break;
        }
      }
      out.push(source.slice(from, i));
    }
    re.lastIndex = i;
  }
  return out;
}

/** Pieces of a source where a finder errs most easily: the bounds of a name, nested calls, strings in arguments. */
const PIECES = [
  'mne(',
  'mne (',
  'myMne(',
  'obj.mne(',
  'mne2(',
  'thClass(',
  'Class(',
  'a.bClass(',
  'mneClass(',
  'xClassy(',
  '$Class(',
  '_mne(',
  ')',
  ', ',
  '\'p10 w5\'',
  '"cF"',
  '\'a\\\'b\'',
  ' ',
  '\n',
  'cond ? ',
  ' : ',
  '[',
  ']',
  '{',
  '}',
  'x',
  '.',
  'mne',
  'Class',
];

/** A repeatable generator: the same sources on every run. */
function sources(count: number, seed: number): string[] {
  let state = seed;
  const next = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
  const out: string[] = [];
  let i = 0;
  let j: number;
  let text: string;
  for (; i < count; i++) {
    text = '';
    for (j = Math.floor(next() * 24); j--;) {
      text += PIECES[Math.floor(next() * PIECES.length)];
    }
    out.push(text);
  }
  return out;
}

describe('sourceStringsProvider — calls agree with one regular expression', () => {
  test.each([
    [
      [
        'mne',
        '*Class',
      ],
    ],
    [['mne']],
    [['*Class']],
    [
      [
        '*Class',
        'mne',
      ],
    ],
    [
      [
        'mneClass',
        'mne',
      ],
    ],
  ])('names %j, 4000 sources', (names) => {
    const strings = sourceStringsProvider({
      calls: names,
    });
    const misses: string[] = [];
    let got: string[];
    for (const source of sources(4000, names.length * 7 + names[0].length)) {
      got = [];
      strings(
        source, got, push,
      );
      if (got.join('\u0001') !== referenceCalls(source, names).join('\u0001')) {
        misses.push(source);
      }
    }
    expect(misses.slice(0, 5)).toEqual([]);
  });
});
