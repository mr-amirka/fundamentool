import type {
  TSourceEdit,
} from './types';

const WHERE = '[fundamentool/source] applyEdits';

/**
 * Two neighbours in the order of the text overlap: the first ends after the second starts, or both start at one point
 * and either replaces something (an insertion and a replacement at one point have no order).
 */
function overlaps(first: TSourceEdit, second: TSourceEdit): boolean {
  return first[1] > second[0] || (first[0] === second[0] && (first[1] > first[0] || second[1] > second[0]));
}

/**
 * The text with edits applied; each edit's positions are the original text's, so no edit moves another. Insertions at
 * one point go in the order given. The result is built in one pass, not one copy of the text per edit.
 *
 * @param source - the original text
 * @param edits - `[from, to, text]`: `to === from` inserts
 * @returns the edited text
 * @throws {RangeError} in development, when two edits overlap
 *
 * @example
 * applyEdits('<b class="p">', [[10, 10, '_l ']]);            // => '<b class="_l p">'
 * applyEdits('a b c', [[4, 5, 'C'], [0, 1, 'A']]);           // => 'A b C'
 */
export function applyEdits(source: string, edits: readonly TSourceEdit[]): string {
  const l = edits.length;
  if (!l) {
    return source;
  }
  // By position; at one point, in the order given.
  const order = edits.map((_edit, i) => i).sort((a, b) => edits[a][0] - edits[b][0] || a - b);
  let out = '';
  let kept = 0;
  let i = 0;
  let edit: TSourceEdit;
  for (; i < l; i++) {
    edit = edits[order[i]];
    if (process.env.NODE_ENV !== 'production' && i && overlaps(edits[order[i - 1]], edit)) {
      throw new RangeError(WHERE + ': edits overlap — [' + edits[order[i - 1]].slice(0, 2).join(', ') + '] and ['
        + edit.slice(0, 2).join(', ') + ']');
    }
    out += source.slice(kept, edit[0]) + edit[2];
    kept = edit[1];
  }
  return out + source.slice(kept);
}
