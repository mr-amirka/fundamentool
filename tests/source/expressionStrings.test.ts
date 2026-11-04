import {
  expressionStrings,
} from '../../src/source';
import {
  readTemplate,
  skipBalanced,
  skipString,
} from '../../src/source/expressionStrings';
import {
  EXPRESSION_CASES,
} from './expressionCases';

const push = (out: string[], text: string): void => {
  out.push(text);
};

/** The strings of an expression at the start of the text. */
function stringsOf(source: string): string[] {
  const out: string[] = [];
  expressionStrings(
    source, 0, out, push,
  );
  return out;
}

describe('expressionStrings', () => {
  test.each(EXPRESSION_CASES)('%s → %j', (expression, expected) => {
    expect(stringsOf(expression)).toEqual(expected);
  });

  test('returns the position after the expression, the spaces after it eaten', () => {
    const source = "v === 'splash' ? 'bg1 cF' : 'fx1' }";
    expect(expressionStrings(
      source, 0, [], push,
    )).toBe(source.indexOf('}'));
  });

  test('stops where the expression can\'t go on', () => {
    expect(expressionStrings(
      "'a', 'b'", 0, [], push,
    )).toBe(3);
    expect(expressionStrings(
      "'a'; x", 0, [], push,
    )).toBe(3);
    expect(expressionStrings(
      '=> x', 0, [], push,
    )).toBe(0);
  });

  test('starts at `at`', () => {
    const out: string[] = [];
    expressionStrings(
      "x = on ? 'a' : 'b'", 4, out, push,
    );
    expect(out).toEqual([
      'a',
      'b',
    ]);
  });

  test('a conditional with no `:` is broken: nothing', () => {
    expect(stringsOf("on ? 'a' }")).toEqual([]);
  });

  test('keeps what the caller had in `out`', () => {
    const out = ['before'];
    expressionStrings(
      "v === 'x' ? 'a' : 'b'", 0, out, push,
    );
    expect(out).toEqual([
      'before',
      'a',
      'b',
    ]);
  });

  test('push is the caller\'s: one string can become several elements', () => {
    const out: string[] = [];
    expressionStrings(
      "v === 'x y' ? 'a b' : 'c'", 0, out, (list, text) => {
        list.push(...text.split(' '));
      },
    );
    expect(out).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('a string is pushed as written between its quotes', () => {
    expect(stringsOf("'a\\'b'")).toEqual(["a\\'b"]);
  });

  test('a substitution read short of its `}` gives nothing', () => {
    expect(stringsOf("`a ${'b' 'c'} d`")).toEqual([
      'a ',
      ' d',
    ]);
  });

  test('a template not closed runs to the end', () => {
    expect(stringsOf('`a ${x')).toEqual(['a ']);
    expect(stringsOf('`a')).toEqual([]);
  });

  test('an escaped backtick doesn\'t close a template', () => {
    expect(stringsOf('`a\\`b`')).toEqual(['a\\`b']);
  });

  test('an empty text gives nothing', () => {
    expect(stringsOf('')).toEqual([]);
  });
});

describe('the skipping helpers', () => {
  test('skipString — after the closing quote; the end when not closed', () => {
    expect(skipString("'a\\'b' c", 0)).toBe(6);
    expect(skipString("'a", 0)).toBe(2);
  });

  test('skipBalanced — after the partner; strings and templates inside skipped', () => {
    expect(skipBalanced("(a, ')', `)`, [b]) c", 0)).toBe(18);
    expect(skipBalanced('(a', 0)).toBe(2);
  });

  test('readTemplate with no push only skips', () => {
    const out: string[] = [];
    expect(readTemplate(
      '`a ${b} c` d', 0, out, undefined,
    )).toBe(10);
    expect(out).toEqual([]);
  });
});
