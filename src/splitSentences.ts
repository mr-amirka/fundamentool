/** Where a sentence ends: after `.`, `!`, `?` or `…` and a space, or at a blank line. */
const SENTENCE_END = /(?<=[.!?…])\s+|\n\s*\n/;

/**
 * A text's sentences: it is cut after `.`, `!`, `?` or `…` followed by a space, and at a blank line. Each sentence is
 * trimmed; the empty ones are left out. A line break alone doesn't end a sentence — cut a Markdown text by its blocks
 * first (markdown-tree's `readBlocks`) to keep a list's items apart. Used by `chunkText` and by a search showing where
 * a long text matched.
 *
 * @param text - The text.
 * @returns Its sentences, in order; `[]` for a text of spaces.
 * @example
 * splitSentences('One tool. Code and documents!\n\nA list:'); // => ['One tool.', 'Code and documents!', 'A list:']
 * splitSentences('v1.2 is out'); // => ['v1.2 is out'] — no space after the dot
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const sentence of text.split(SENTENCE_END)) {
    const trimmed = sentence.trim();
    if (trimmed !== '') {
      sentences.push(trimmed);
    }
  }
  return sentences;
}
