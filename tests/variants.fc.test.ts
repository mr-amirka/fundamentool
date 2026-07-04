/**
 * Property-based тесты для variants и variantsProvider.
 */

import fc from 'fast-check';
import { variants } from '../src/variants';
import { variantsProvider } from '../src/variantsProvider';

const alphaChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';

function arbitraryMnExpression(): fc.Arbitrary<string> {
  const alpha = fc.array(fc.constantFrom(...alphaChars.split('')), { minLength: 0, maxLength: 5 })
    .map(arr => arr.join(''));
  return fc.tuple(alpha, alpha, alpha).map(([prefix, middle, suffix]) => {
    if (middle.length === 0) return prefix + suffix;
    return `${prefix}(${middle})${suffix}`;
  });
}

describe('variants — property-based', () => {
  test('fast-check: возвращает непустой массив для любого выражения', () => {
    fc.assert(fc.property(arbitraryMnExpression(), (expr) => {
      const [result] = variants(expr);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    }));
  });

  test('fast-check: все элементы — строки', () => {
    fc.assert(fc.property(arbitraryMnExpression(), (expr) => {
      const [result] = variants(expr);
      result.forEach(s => expect(typeof s).toBe('string'));
    }));
  });

  test('fast-check: maxDepth >= 0', () => {
    fc.assert(fc.property(arbitraryMnExpression(), (expr) => {
      const [, maxDepth] = variants(expr);
      expect(maxDepth).toBeGreaterThanOrEqual(0);
    }));
  });

  test('fast-check: variants не падает на любом строковом входе', () => {
    fc.assert(fc.property(fc.string(), (input) => {
      expect(() => variants(input)).not.toThrow();
    }));
  });

  test('fast-check: кастомный variantsProvider с разделителем "|" даёт строки', () => {
    const provider = variantsProvider({
      separator: '|',
      scopeStart: '(',
      scopeEnd: ')',
      maxDepth: 10,
    });
    fc.assert(fc.property(arbitraryMnExpression(), (expr) => {
      const [result] = provider(expr);
      expect(Array.isArray(result)).toBe(true);
      result.forEach(s => expect(typeof s).toBe('string'));
    }));
  });
});
