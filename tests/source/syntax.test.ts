import ts from 'typescript';
import {
  expressionStrings,
  parseSource,
  syntaxStringsProvider,
  syntaxValueRanges,
} from '../../src/source';
import type {
  TStringPlaces,
  TTypeScript,
} from '../../src/source';
import {
  EXPRESSION_CASES,
} from './expressionCases';

const push = (out: string[], text: string): void => {
  out.push(text);
};

/** The strings of a parsed text at these places. */
function stringsOf(
  places: TStringPlaces, source: string, fileName?: string,
): string[] {
  const out: string[] = [];
  const file = parseSource(
    ts, source, fileName,
  );
  expect(file).toBeDefined();
  syntaxStringsProvider(ts, places)(
    file as ts.SourceFile, out, push,
  );
  return out;
}

describe('parseSource', () => {
  test('a tree for a file that parses', () => {
    expect(parseSource(
      ts, '<b className="p10" />', 'App.tsx',
    )?.kind).toBe(ts.SyntaxKind.SourceFile);
  });

  test('undefined for a file with a syntax error', () => {
    expect(parseSource(
      ts, 'const a = (', 'a.ts',
    )).toBeUndefined();
  });

  test('the dialect is the file\'s: `.ts` reads `<T>` as a cast, the rest as TSX', () => {
    const cast = 'const a = <string>b;';
    expect(parseSource(
      ts, cast, 'a.ts',
    )).toBeDefined();
    expect(parseSource(
      ts, cast, 'a.mts',
    )).toBeDefined();
    expect(parseSource(
      ts, cast, 'a.cts',
    )).toBeDefined();
    expect(parseSource(
      ts, cast, 'a.tsx',
    )).toBeUndefined();
    expect(parseSource(
      ts, cast, 'noext',
    )).toBeUndefined();
    expect(parseSource(ts, cast)).toBeUndefined();
  });

  test.each([
    [
      null,
      'null',
    ],
    [
      {},
      'object',
    ],
    [
      undefined,
      'undefined',
    ],
  ])('a module that isn\'t TypeScript\'s (%j) — an error in development', (module, got) => {
    expect(() => parseSource(module as unknown as TTypeScript, '')).toThrow('[fundamentool/source] parseSource: expects TypeScript\'s module (the typescript package), got ' + got);
  });
});

describe('syntaxStringsProvider — the same strings as the text', () => {
  test.each(EXPRESSION_CASES)('%s → %j', (expression, expected) => {
    const text: string[] = [];
    expressionStrings(
      expression, 0, text, push,
    );
    expect(text).toEqual(expected);
    expect(stringsOf({
      variables: ['aClass'],
    }, 'const aClass = ' + expression + ';')).toEqual(expected);
  });
});

describe('syntaxStringsProvider — the places', () => {
  test('a JSX attribute: a string, braces, an expression; one with no value gives nothing', () => {
    expect(stringsOf({
      attrs: ['className'],
    }, '<><a className="x" /><b className={\'y\'} /><c className={on && \'z\'} /><d className /><e className={} /></>'))
      .toEqual([
        'x',
        'y',
        'z',
      ]);
  });

  test('an object key of attrs or variables, nested ones too', () => {
    expect(stringsOf({
      attrs: ['className'],
      variables: ['*Class'],
    }, "f({ slotProps: { paper: { className: 'w320' } }, rowClass: 'p10', 'className': 'q' });"))
      .toEqual([
        'w320',
        'p10',
        'q',
      ]);
  });

  test('a variable, a type between included; another name gives nothing', () => {
    expect(stringsOf({
      variables: ['*Class'],
    }, "const aClass: string = 'p10'; const thClassy = 'x'; const [bClass] = ['y'];")).toEqual(['p10']);
  });

  test('a call: every string of its arguments; a method is another function', () => {
    expect(stringsOf({
      calls: [
        'mne',
        '*Class',
      ],
    }, "mne(base, cond ? 'a' : mne(x, 'p10')); thClass('w150'); obj.mne('no'); other('no');"))
      .toEqual([
        'a',
        'p10',
        'p10',
        'w150',
      ]);
  });

  test('a string is pushed as its value', () => {
    expect(stringsOf({
      variables: ['aClass'],
    }, "const aClass = 'a\\'b';")).toEqual(["a'b"]);
  });

  test('markup inside a string or a template, for the patterns whose mark it holds', () => {
    expect(stringsOf({
      attrs: [
        'class',
        '*ClassName',
      ],
    }, 'const a = \'<b class="p10">\'; const b = `<i iconClassName="w5">${x}<u class="cF">`; const c = "class";'))
      .toEqual([
        'p10',
        'w5',
        'cF',
      ]);
  });

  test('comments give nothing: the tree has none', () => {
    expect(stringsOf({
      attrs: ['className'],
    }, '// <b className="no" />\n/** <i className="no" /> */\n<u className="yes" />')).toEqual(['yes']);
  });

  test('the reader is safe to call again from inside push', () => {
    const inner = syntaxStringsProvider(ts, {
      variables: ['bClass'],
    });
    const outer = syntaxStringsProvider(ts, {
      variables: ['aClass'],
    });
    const innerFile = parseSource(ts, "const bClass = 'in';") as ts.SourceFile;
    const out: string[] = [];
    outer(
      parseSource(ts, "const aClass = on ? 'x' : 'y';") as ts.SourceFile, out, (list, text) => {
        list.push(text);
        inner(
          innerFile, list, push,
        );
      },
    );
    expect(out).toEqual([
      'x',
      'in',
      'y',
      'in',
    ]);
  });

  test('the options are checked in development', () => {
    expect(() => syntaxStringsProvider(ts, {
      atrs: [],
    } as unknown as TStringPlaces)).toThrow('unknown option "atrs"');
    expect(() => syntaxStringsProvider(null as unknown as TTypeScript, {})).toThrow('syntaxStringsProvider: expects');
  });
});

describe('syntaxValueRanges', () => {
  /** The values' texts. */
  function values(source: string, names: string[]): string[] {
    return syntaxValueRanges(
      ts, parseSource(ts, source) as ts.SourceFile, names,
    ).map((range) => source
      .slice(range[0], range[1]));
  }

  test('a string, the expression inside braces, an object key\'s value', () => {
    expect(values('<><a className="x" /><b className={on && "y"} /></>; f({ className: `z` })', ['className']))
      .toEqual([
        '"x"',
        'on && "y"',
        '`z`',
      ]);
  });

  test('a value is not searched for more; an attribute with no value gives nothing', () => {
    expect(values('<><a className={{ className: "in" }} /><b className /><c className={} /></>', ['className']))
      .toEqual(['{ className: "in" }']);
  });

  test('a quoted key is a name; a computed one is none', () => {
    expect(values("f({ 'className': 'q', [k]: 'r' })", [
      'className',
      'k',
    ])).toEqual(["'q'"]);
  });

  test('the names are patterns', () => {
    expect(values('<a iconClassName="x" ClassName="y" />', ['*ClassName'])).toEqual(['"x"']);
  });

  test('a module that isn\'t TypeScript\'s — an error in development', () => {
    expect(() => syntaxValueRanges(
      {} as TTypeScript, {} as ts.SourceFile, [],
    )).toThrow('syntaxValueRanges: expects');
  });
});
