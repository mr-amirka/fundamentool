import {
  variants, 
} from '../src/variants';

describe('variants', () => {
  test('with "P(eter|awel|atrik)"', () => {
    const [strings, depth] = variants('P(eter|awel|atrik)');
    expect(strings).toEqual([
      'Peter',
      'Pawel',
      'Patrik',
    ]);
    expect(depth).toBe(1);
  });

  test('with "re(build|code)"', () => {
    const [strings, depth] = variants('re(build|code)');
    expect(strings).toEqual(['rebuild', 'recode']);
    expect(depth).toBe(1);
  });

  test('with "(in|de|re)(ject|code)"', () => {
    const [strings] = variants('(in|de|re)(ject|code)');
    expect(strings).toEqual([
      'inject',
      'incode',
      'deject',
      'decode',
      'reject',
      'recode',
    ]);
  });

  test('with "В(олод|ас)я"', () => {
    const [strings] = variants('В(олод|ас)я');
    expect(strings).toEqual(['Володя', 'Вася']);
  });

  test('with "V((olod|as)ya|italiy)"', () => {
    const [strings, depth] = variants('V((olod|as)ya|italiy)');
    expect(strings).toEqual([
      'Volodya',
      'Vasya',
      'Vitaliy',
    ]);
    expect(depth).toBe(2);
  });

  test('with "((|p)re|de|un)(build|cod)(|er|ing)"', () => {
    const [strings] = variants('((|p)re|de|un)(build|cod)(|er|ing)');
    expect(strings).toEqual([
      'rebuild',
      'rebuilder',
      'rebuilding',
      'recod',
      'recoder',
      'recoding',
      'prebuild',
      'prebuilder',
      'prebuilding',
      'precod',
      'precoder',
      'precoding',
      'debuild',
      'debuilder',
      'debuilding',
      'decod',
      'decoder',
      'decoding',
      'unbuild',
      'unbuilder',
      'unbuilding',
      'uncod',
      'uncoder',
      'uncoding',
    ]);
  });

  test('it should ignore service characters with escaping', () => {
    const [strings] = variants('h\\(ate\\|elp\\) me');
    expect(strings).toEqual(['h(ate|elp) me']);
  });

  test('applyUnslash false leaves escapes in output strings', () => {
    const [raw] = variants('h\\(ate\\|elp\\) me', false);
    expect(raw[0]).toContain('\\');
  });
});
