import {
  sfcParts,
} from '../../src/source';
import type {
  TSfcPart,
} from '../../src/source';

/** The parts as their texts, for reading. */
function texts(source: string): Array<[number, string]> {
  return sfcParts(source).map((part: TSfcPart) => [
    part[0],
    source.slice(part[1], part[2]),
  ]);
}

describe('sfcParts', () => {
  test('markup and a script, the tags in the markup', () => {
    expect(texts('<template><b/></template><script lang="ts">let a</script>')).toEqual([
      [
        0,
        '<template><b/></template><script lang="ts">',
      ],
      [
        1,
        'let a',
      ],
      [
        0,
        '</script>',
      ],
    ]);
  });

  test('`lang="tsx"` and `lang=\'jsx\'` are read with JSX', () => {
    expect(sfcParts('<script lang="tsx">a</script>')[1][0]).toBe(2);
    expect(sfcParts("<script lang='jsx'>a</script>")[1][0]).toBe(2);
    expect(sfcParts('<script setup>a</script>')[1][0]).toBe(1);
  });

  test('several scripts', () => {
    expect(texts('<script>a</script><p/><script>b</script>').map((part) => part[1])).toEqual([
      '<script>',
      'a',
      '</script><p/><script>',
      'b',
      '</script>',
    ]);
  });

  test('Astro\'s frontmatter: a TS script between the fences', () => {
    expect(texts('---\nconst a = 1\n---\n<b/>')).toEqual([
      [
        0,
        '---',
      ],
      [
        1,
        '\nconst a = 1',
      ],
      [
        0,
        '\n---\n<b/>',
      ],
    ]);
  });

  test('a fence not closed is markup', () => {
    expect(texts('---\na')).toEqual([
      [
        0,
        '---\na',
      ],
    ]);
  });

  test('a script with no `>` or no `</script` ends the parts', () => {
    expect(texts('<b/><script')).toEqual([
      [
        0,
        '<b/><script',
      ],
    ]);
    expect(texts('<script>a')).toEqual([
      [
        0,
        '<script>a',
      ],
    ]);
  });

  test('the parts cover the text in order, with no gaps', () => {
    const source = '---\nx\n---\n<a/><script>b</script><c/><script lang="tsx">d</script>';
    const parts = sfcParts(source);
    let at = 0;
    for (const part of parts) {
      expect(part[1]).toBe(at);
      at = part[2];
    }
    expect(at).toBe(source.length);
  });

  test('an empty text has no parts; an empty script is a part', () => {
    expect(sfcParts('')).toEqual([]);
    expect(texts('<script></script>')).toEqual([
      [
        0,
        '<script>',
      ],
      [
        1,
        '',
      ],
      [
        0,
        '</script>',
      ],
    ]);
  });
});
