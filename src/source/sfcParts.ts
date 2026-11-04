import type {
  TSfcPart,
} from './types';

const FENCE = '---';

/**
 * A script's kind by its tag: `lang="tsx"` and `lang="jsx"` are the only ones read with JSX. In a plain
 * `<script lang="ts">` a `<` is a comparison or a generic, and reading it as TSX would trip on it.
 */
function scriptKind(
  source: string, from: number, to: number,
): 1 | 2 {
  const tag = source.slice(from, to);
  return tag.indexOf('sx"') > -1 || tag.indexOf('sx\'') > -1 ? 2 : 1;
}

/**
 * The parts of a single-file component (`.vue`, `.svelte`, `.astro`), in order and with no gaps: the markup, and each
 * script's body — `<script>…</script>`, and Astro's frontmatter `---…---` at the very start. A script is plain
 * JS/TS, so a parser can read it; the markup is read as text. The tags and the fences belong to the markup.
 *
 * A script whose `>` or `</script` is missing ends the parts: the rest is markup.
 *
 * @param source - the component's text
 * @returns the parts `[kind, from, to]`: `0` — markup, `1` — a TS script, `2` — a TSX script; an empty markup part
 *   is left out
 *
 * @example
 * sfcParts('<template><b/></template><script lang="ts">let a</script>');
 * // => [[0, 0, 43], [1, 43, 48], [0, 48, 57]]
 * sfcParts('---\nconst a = 1\n---\n<b/>');
 * // => [[0, 0, 3], [1, 3, 15], [0, 15, 24]]
 */
export function sfcParts(source: string): TSfcPart[] {
  const parts: TSfcPart[] = [];
  let i = 0;
  let open: number;
  let body: number;
  let close: number;
  if (source.startsWith(FENCE)) {
    close = source.indexOf('\n' + FENCE, 3);
    if (close > -1) {
      parts.push([
        0,
        0,
        3,
      ], [
        1,
        3,
        close,
      ]);
      i = close;
    }
  }
  while ((open = source.indexOf('<script', i)) > -1) {
    body = source.indexOf('>', open);
    if (body < 0) {
      break;
    }
    close = source.indexOf('</script', body);
    if (close < 0) {
      break;
    }
    parts.push([
      0,
      i,
      body + 1,
    ], [
      scriptKind(
        source, open, body,
      ),
      body + 1,
      close,
    ]);
    i = close;
  }
  i < source.length && parts.push([
    0,
    i,
    source.length,
  ]);
  return parts;
}
