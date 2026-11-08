/** A long text in pieces a model reads whole (fundamentool D-099): whole sentences where they fit. */
import {
  lazy,
  number,
  object,
} from '../schema';
import {
  WHERE,
} from './math';

/** `chunkText`'s options. */
export type TChunkTextOptions = {
  /** The most words in a piece (default 200 — about 270 tokens, within a 512-token model). */
  maxWords?: number;
  /** Words a piece repeats of the one before (default 20), so a thought cut between two is in both. */
  overlap?: number;
};

const OPTIONS = /*#__PURE__*/ lazy(() => object({
  maxWords: number().int().min(1).optional(),
  overlap: number().int().min(0).optional(),
}));

/** Where a sentence ends: after `.`, `!`, `?` or `…` and a space, or at a blank line. */
const SENTENCE_END = /(?<=[.!?…])\s+|\n\s*\n/;
const SPACE = /\s+/;

/**
 * A text's words, as `chunkText` and `chunkBlocks` count them: the runs between spaces.
 *
 * @param text - The text.
 * @returns Its words; `[]` for a text of spaces.
 * @example
 * wordsOf(' One  tool.\n'); // => ['One', 'tool.']
 */
export const wordsOf = (text: string): string[] => text.split(SPACE).filter((word) => word !== '');

/**
 * The options of a cut into pieces, checked (in development) and with their defaults: `[maxWords, overlap]`.
 *
 * @param name    - The function's name, for the messages.
 * @param options - `maxWords`, `overlap`.
 * @returns `[maxWords, overlap]`.
 * @throws {TypeError} An unknown option, a value not a whole number, `overlap` not below `maxWords`.
 */
export function windowOf(name: string, options: TChunkTextOptions): [maxWords: number, overlap: number] {
  if (process.env.NODE_ENV !== 'production') {
    OPTIONS().parse(options, `${WHERE} ${name}`);
  }
  const {
    maxWords = 200, overlap = 20,
  } = options;
  if (overlap >= maxWords) {
    throw new TypeError(`${WHERE} ${name}: overlap is below maxWords, got overlap ${overlap} and maxWords ${maxWords}`);
  }
  return [
    maxWords,
    overlap,
  ];
}

/**
 * A text cut into pieces of at most `maxWords` words, for a model that reads a limited length. Whole sentences go into a
 * piece while they fit; the next piece starts with the last sentence of the one before when it has at most `overlap`
 * words; a sentence longer than `maxWords` is cut into windows that share `overlap` words.
 *
 * @param text    - The text.
 * @param options - `maxWords`, `overlap`.
 * @returns The pieces, in order; `[]` for a text of no words; the text itself when it fits.
 * @throws {TypeError} An unknown option ("did you mean"), a value not a whole number, `overlap` not below `maxWords`.
 * @example
 * chunkText('One two. Three four five. Six.', { maxWords: 3, overlap: 1 });
 * // => ['One two.', 'Three four five.', 'Six.']
 */
export function chunkText(text: string, options: TChunkTextOptions = {}): string[] {
  const [
    maxWords,
    overlap,
  ] = windowOf('chunkText', options);
  if (wordsOf(text).length <= maxWords) {
    return text.trim() === '' ? [] : [text];
  }
  const pieces: string[] = [];
  let current: string[] = [];
  let currentWords = 0;
  let last: string[] = [];
  const flush = () => {
    if (current.length > 0) {
      pieces.push(current.join(' '));
      // The next piece opens with this one's last sentence, when it is short enough to repeat.
      const tail = current[current.length - 1];
      last = wordsOf(tail).length <= overlap ? [tail] : [];
      current = [];
      currentWords = 0;
    }
  };
  for (const sentence of text.split(SENTENCE_END)) {
    const words = wordsOf(sentence);
    if (words.length === 0) {
      continue;
    }
    if (words.length > maxWords) {
      flush();
      const stride = maxWords - overlap;
      for (let start = 0; ; start += stride) {
        pieces.push(words.slice(start, start + maxWords).join(' '));
        if (start + maxWords >= words.length) {
          break;
        }
      }
      last = [];
      continue;
    }
    if (currentWords + words.length > maxWords) {
      flush();
      const carried = last.length > 0 ? wordsOf(last[0]).length : 0;
      if (carried + words.length <= maxWords) {
        current = [...last];
        currentWords = carried;
      }
    }
    current.push(sentence.trim());
    currentWords += words.length;
  }
  flush();
  return pieces;
}
