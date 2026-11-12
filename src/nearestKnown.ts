/**
 * "Did you mean": the known name nearest to one given, and the message for an option outside the known ones. An
 * options object is checked through `fundamentool/schema` (lab D-073), which writes its message here; a name looked up
 * in data at run time — an operator, a hook, a project — takes `nearestKnown` itself.
 */

import {
  alignmentDistance,
} from './alignmentDistance';

/**
 * The name of `known` nearest to `key` (case aside, at most two edits away, a swap of two neighbouring letters one edit —
 * `alignmentDistance`) — the "did you mean" of an error; `''` — none is near.
 *
 * @example
 * nearestKnown('onbording', ['onboarding', 'signIn']); // => 'onboarding'
 * nearestKnown('x', ['onboarding']); // => ''
 */
export function nearestKnown(key: string, known: readonly string[]): string {
  let best = '';
  let bestDistance = 3;
  for (const candidate of known) {
    const distance = alignmentDistance(
      key.toLowerCase(), candidate.toLowerCase(), 2,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * The message for an option outside `known`: with the nearest known one ("did you mean"), or the list of them — the
 * one place it is written (`fundamentool/schema`'s objects).
 *
 * @example
 * unknownOptionText('kep', ['keep']); // => 'unknown option "kep". Did you mean "keep"?'
 */
export function unknownOptionText(key: string, known: readonly string[]): string {
  const best = nearestKnown(key, known);
  return best ? `unknown option "${key}". Did you mean "${best}"?` : `unknown option "${key}". Known options: ${known.join(', ')}`;
}
