/**
 * Property-based тесты: round-trip инварианты для пар утилит fundamentool.
 */

import fc from 'fast-check';
import { scopeSplit } from '../src/scopeSplit';
import { scopeJoin } from '../src/scopeJoin';
import { escapedSplitProvider } from '../src/escapedSplitProvider';
import { unslash } from '../src/unslash';
import { escapeCss } from '../src/escapeCss';
import { escapeQuote } from '../src/escapeQuote';
import { escapeRegExp } from '../src/escapeRegExp';
import { camelToKebabCase } from '../src/camelToKebabCase';
import { kebabToCamelCase } from '../src/kebabToCamelCase';

function stringFromChars(chars: string, minLen = 0, maxLen = 20): fc.Arbitrary<string> {
  return fc.array(
    fc.constantFrom(...chars.split('')),
    { minLength: minLen, maxLength: maxLen },
  ).map((arr: string[]) => arr.join(''));
}

describe('scopeSplit ↔ scopeJoin — round-trip', () => {
  test('fast-check: scopeJoin(scopeSplit(s)) === s для строк без скобок', () => {
    const noParens = stringFromChars('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _');
    fc.assert(fc.property(noParens, (input: string) => {
      const tree = scopeSplit(input, '(', ')');
      expect(scopeJoin(tree, '(', ')')).toBe(input);
    }));
  });

  test('fast-check: scopeSplit на любом входе: либо успех, либо Error', () => {
    fc.assert(fc.property(fc.string(), (input: string) => {
      try {
        const tree = scopeSplit(input, '(', ')');
        expect(Array.isArray(tree)).toBe(true);
      } catch (e) {
        // Несбалансированные скобки — допустимый throw
        expect(e).toBeInstanceOf(Error);
      }
    }));
  });
});

describe('escapedSplitProvider — инварианты', () => {
  test('fast-check: unslash(base[i]) === main[i] для любого входа', () => {
    const split = escapedSplitProvider(',');
    fc.assert(fc.property(fc.string(), (input: string) => {
      const baseResult = split.base(input);
      const mainResult = split(input);
      expect(mainResult.length).toBe(baseResult.length);
      for (let i = 0; i < mainResult.length; i++) {
        expect(unslash(baseResult[i])).toBe(mainResult[i]);
      }
    }));
  });

  test('fast-check: split не падает на любом входе', () => {
    const split = escapedSplitProvider('|');
    fc.assert(fc.property(fc.string(), (input: string) => {
      expect(() => split(input)).not.toThrow();
    }));
  });
});

describe('escape → unslash — частичный round-trip', () => {
  test('fast-check: unslash(escapeCss(s)) для строк без спецсимволов', () => {
    const simple = stringFromChars('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    fc.assert(fc.property(simple, (input: string) => {
      expect(unslash(escapeCss(input))).toBe(input);
    }));
  });

  test('fast-check: unslash(escapeQuote(s)) === s для строк без кавычек', () => {
    const noQuote = stringFromChars('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-');
    fc.assert(fc.property(noQuote, (input: string) => {
      expect(unslash(escapeQuote(input))).toBe(input);
    }));
  });

  test('fast-check: escapeCss не падает', () => {
    fc.assert(fc.property(fc.string(), (input: string) => {
      expect(() => escapeCss(input)).not.toThrow();
    }));
  });

  test('fast-check: escapeRegExp не падает', () => {
    fc.assert(fc.property(fc.string(), (input: string) => {
      expect(() => escapeRegExp(input)).not.toThrow();
    }));
  });
});

describe('camelToKebabCase ↔ kebabToCamelCase — round-trip', () => {
  test('fast-check: kebabToCamelCase(camelToKebabCase(s)) === s для camelCase', () => {
    const lower = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split(''));
    const upper = fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
    const lowerWord = fc.array(lower, { minLength: 1, maxLength: 8 }).map((arr: string[]) => arr.join(''));
    const camelString: fc.Arbitrary<string> = fc.tuple(
      lowerWord,
      fc.array(
        fc.tuple(upper, lowerWord).map(([u, r]: [string, string]) => u + r),
        { minLength: 0, maxLength: 4 },
      ),
    ).map(([first, parts]: [string, string[]]) => first + parts.join(''));

    fc.assert(fc.property(camelString, (input: string) => {
      expect(kebabToCamelCase(camelToKebabCase(input))).toBe(input);
    }));
  });
});
