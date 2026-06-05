import { variants } from '../src/variants';
import { variantsProvider } from '../src/variantsProvider';

const defaultMn = variantsProvider({
  separator: '|',
  scopeStart: '(',
  scopeEnd: ')',
  maxDepth: Number.POSITIVE_INFINITY,
});

describe('variantsProvider', () => {
  test('matches variants() strings and reports maxDepth', () => {
    const exp = 'P(eter|awel|atrik)';
    const [a, d] = defaultMn(exp);
    const [b, d2] = variants(exp);
    expect(a).toEqual(b);
    expect(d).toBe(d2);
    expect(d).toBe(1);
  });

  test('nested depth for V((olod|as)ya|italiy)', () => {
    const exp = 'V((olod|as)ya|italiy)';
    const [a, d] = defaultMn(exp);
    const [b, d2] = variants(exp);
    expect(a).toEqual(b);
    expect(d).toBe(d2);
    expect(d).toBe(2);
  });

  test('maxDepth 0 rejects any group', () => {
    const strict = variantsProvider({
      separator: '|',
      scopeStart: '(',
      scopeEnd: ')',
      maxDepth: 0,
    });
    expect(() => strict('a(b|c)')).toThrow(RangeError);
  });

  test('maxDepth negative is normalized like 0 (no groups)', () => {
    const noGroups = variantsProvider({
      separator: '|',
      scopeStart: '(',
      scopeEnd: ')',
      maxDepth: -3,
    });
    expect(() => noGroups('a(b|c)')).toThrow(RangeError);
  });

  test('maxDepth NaN throws at factory', () => {
    expect(() =>
      variantsProvider({
        separator: '|',
        scopeStart: '(',
        scopeEnd: ')',
        maxDepth: Number.NaN,
      }),
    ).toThrow(TypeError);
  });

  test('maxDepth 1 allows only one nesting level', () => {
    const shallow = variantsProvider({
      separator: '|',
      scopeStart: '(',
      scopeEnd: ')',
      maxDepth: 1,
    });
    expect(shallow('a(b|c)')).toEqual([['ab', 'ac'], 1]);
    expect(() => shallow('a((b|c))')).toThrow(RangeError);
  });

  test('custom separator still uses default scopes', () => {
    const slash = variantsProvider({
      separator: '/',
      scopeStart: '(',
      scopeEnd: ')',
      maxDepth: Number.POSITIVE_INFINITY,
    });
    const [out, depth] = slash('P(eter/awel/atrik)');
    expect(out).toEqual(['Peter', 'Pawel', 'Patrik']);
    expect(depth).toBe(1);
  });

  test('multi-character scope delimiters (structure only, markers not in output)', () => {
    const angle = variantsProvider({
      separator: '|',
      scopeStart: '<<',
      scopeEnd: '>>',
      maxDepth: Number.POSITIVE_INFINITY,
    });
    expect(angle('x<<a|b>>')).toEqual([['xa', 'xb'], 1]);
    expect(variants('x(a|b)')[0]).toEqual(['xa', 'xb']);
  });

  test('maxOutputCount rejects too many strings', () => {
    const limited = variantsProvider({
      separator: '|',
      scopeStart: '(',
      scopeEnd: ')',
      maxDepth: Number.POSITIVE_INFINITY,
      maxOutputCount: 2,
    });
    expect(() => limited('P(eter|awel|atrik)')).toThrow(RangeError);
    expect(() => limited('(a|b)(c|d)')).toThrow(RangeError);
    const ok = variantsProvider({
      separator: '|',
      scopeStart: '(',
      scopeEnd: ')',
      maxDepth: Number.POSITIVE_INFINITY,
      maxOutputCount: 3,
    });
    expect(ok('P(eter|awel|atrik)')[0]).toHaveLength(3);
  });

  test('maxOutputCount NaN throws at factory', () => {
    expect(() =>
      variantsProvider({
        separator: '|',
        scopeStart: '(',
        scopeEnd: ')',
        maxDepth: Number.POSITIVE_INFINITY,
        maxOutputCount: Number.NaN,
      }),
    ).toThrow(TypeError);
  });

  test('rejects identical scopeStart and scopeEnd', () => {
    expect(() =>
      variantsProvider({
        separator: '|',
        scopeStart: '##',
        scopeEnd: '##',
        maxDepth: 1,
      }),
    ).toThrow(TypeError);
  });
});
