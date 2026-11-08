/** A structured text in pieces a model reads whole (fundamentool D-110): whole blocks where they fit. */
import {
  array,
  boolean,
  lazy,
  object,
  string,
} from '../schema';
import {
  type TChunkTextOptions,
  chunkText,
  windowOf,
  wordsOf,
} from './chunkText';
import {
  WHERE,
} from './math';

/** A block of a text — a paragraph, a heading, a list item, a code block, a table — as its reader gives it. */
export type TTextBlock = {
  /** The block as written. */
  text: string;
  /** What a piece opening inside the block's section starts with: its heading. Used when it has at most `overlap`
   * words. */
  context?: string;
  /** Never a piece's last block: a heading, a lead-in ending with `:` — it goes to the next piece with the block after
   * it. */
  keepWithNext?: boolean;
};

const BLOCKS = /*#__PURE__*/ lazy(() => array(object({
  text: string(),
  context: string().optional(),
  keepWithNext: boolean().optional(),
})));

/** Between two blocks in a piece. */
const BLANK_LINE = '\n\n';

/** A block with its words counted. */
type TSized = [block: TTextBlock, words: number];

/**
 * A structured text's blocks packed into pieces of at most `maxWords` words, for a model that reads a limited length:
 * whole blocks while they fit, joined by a blank line. A piece opening inside a section starts with the section's
 * `context` (when it has at most `overlap` words); a `keepWithNext` block goes to the next piece with the block after
 * it; the block before a cut opens the next piece too when it has at most `overlap` words; a block too long for a
 * piece is cut by `chunkText` into windows of `maxWords - overlap` words, each opened by its `context`.
 *
 * @param blocks  - The text's blocks, in order — from a reader such as `markdown-tree`'s `readBlocks`.
 * @param options - `maxWords` (200), `overlap` (20) — as `chunkText`'s.
 * @returns The pieces, in order; `[]` for blocks of no words; one piece, the blocks joined, when they fit.
 * @throws {TypeError} A block not `{ text, context?, keepWithNext? }`, an unknown option ("did you mean"), a value not
 * a whole number, `overlap` not below `maxWords` (in development, but the last).
 * @example
 * chunkBlocks([
 *   { text: '## Install', keepWithNext: true },
 *   { text: 'Run the build first. It takes a minute.', context: 'Install' },
 *   { text: '```sh\npnpm run build\n```', context: 'Install' },
 * ], { maxWords: 12, overlap: 3 });
 * // => ['## Install\n\nRun the build first. It takes a minute.', 'Install\n\n```sh\npnpm run build\n```']
 */
export function chunkBlocks(blocks: readonly TTextBlock[], options: TChunkTextOptions = {}): string[] {
  if (process.env.NODE_ENV !== 'production') {
    BLOCKS().parse(blocks, `${WHERE} chunkBlocks`);
  }
  const [
    maxWords,
    overlap,
  ] = windowOf('chunkBlocks', options);
  const contextWords = (block: TTextBlock): number => {
    const words = block.context === undefined ? 0 : wordsOf(block.context).length;
    return words <= overlap ? words : 0;
  };

  const given: TSized[] = [];
  let total = 0;
  for (const block of blocks) {
    const words = wordsOf(block.text).length;
    if (words > 0) {
      given.push([
        block,
        words,
      ]);
      total += words;
    }
  }
  if (given.length === 0) {
    return [];
  }
  if (total <= maxWords) {
    return [given.map(([block]) => block.text).join(BLANK_LINE)];
  }

  // A block too long for a piece cut into windows that leave room for its context.
  const sized: TSized[] = [];
  const room = maxWords - overlap;
  for (const item of given) {
    const [block] = item;
    if (item[1] + contextWords(block) <= maxWords) {
      sized.push(item);
      continue;
    }
    for (const window of chunkText(block.text, {
      maxWords: room,
      overlap: Math.min(overlap, room - 1),
    })) {
      sized.push([
        {
          text: window,
          ...block.context === undefined ? {} : {
            context: block.context,
          },
        },
        wordsOf(window).length,
      ]);
    }
  }

  // The units packed: the blocks kept with the next and that next one.
  const units: TSized[][] = [];
  let run: TSized[] = [];
  for (const item of sized) {
    run.push(item);
    if (item[0].keepWithNext !== true) {
      units.push(run);
      run = [];
    }
  }
  if (run.length > 0) {
    units.push(run);
  }

  const pieces: string[] = [];
  let parts: string[] = [];
  let words = 0;
  let last: TSized | undefined;
  const open = (first: TTextBlock): void => {
    const own = contextWords(first);
    parts = own > 0 ? [first.context as string] : [];
    words = own;
  };
  const add = (item: TSized): void => {
    parts.push(item[0].text);
    words += item[1];
    last = item;
  };
  const place = (unit: readonly TSized[]): void => {
    const size = unit.reduce((sum, item) => sum + item[1], 0);
    if (last !== undefined && words + size > maxWords) {
      pieces.push(parts.join(BLANK_LINE));
      // The block before the cut opens the next piece, when it is short and the unit still fits after it.
      const carried = last;
      last = undefined;
      open(carried[0]);
      if (carried[1] <= overlap && words + carried[1] + size <= maxWords) {
        add(carried);
      } else {
        open(unit[0][0]);
      }
    } else if (last === undefined) {
      open(unit[0][0]);
    }
    for (const item of unit) {
      add(item);
    }
  };
  for (const unit of units) {
    // Kept together they overflow any piece: the first ones go alone, until the rest fits with its context.
    let rest = unit;
    while (rest.length > 1 && rest.reduce((sum, item) => sum + item[1], 0) + contextWords(rest[0][0]) > maxWords) {
      place([rest[0]]);
      rest = rest.slice(1);
    }
    place(rest);
  }
  pieces.push(parts.join(BLANK_LINE));
  return pieces;
}
