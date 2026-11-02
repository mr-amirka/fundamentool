import {
  unslash,
} from './unslash';
import {
  map,
} from './map';
import {
  escapedSplitReader,
} from './escapedSplitProvider';
import type {
  TEscapedSplitOptions,
} from './escapedSplitProvider';

/** Splits a string at its first separator (outside escapes and, when given, brackets). */
export interface IEscapedHalf {
  /**
   * Splits the input into `[prefix, suffix, value]`, each unescaped (`unslash`): `suffix` starts with the separator,
   * `value` is what follows it. No separator — `[input, '', '']`.
   *
   * @param input - The input string to split.
   * @returns `[prefix, suffix, value]`.
   */
  (input: string): [string, string, string];

  /**
   * The same, as written — escapes kept.
   *
   * @param input - The input string to split.
   * @returns `[prefix, suffix, value]`.
   */
  base: (input: string) => [string, string, string];
}

/**
 * Creates a helper that splits a string at its first separator into `[prefix, suffix, value]`: `suffix` starts with
 * the separator, `value` is the tail. The options are {@link escapedSplitProvider}'s. It reads up to the first
 * separator only: a bracket after it isn't seen, nor reported.
 *
 * @param options - The separator, the escape, the brackets.
 * @returns The helper: the parts unescaped, or as written with `.base`.
 * @example
 * const half = escapedHalfProvider({ separator: ':' });
 * half('key:value');        // => ['key', ':value', 'value']
 * half('key\\:name:value'); // => ['key:name', ':value', 'value']
 * escapedHalfProvider({ separator: ':', brackets: bracketPairs([['[', ']']]) }).base('a[b:c]:d'); // => ['a[b:c]', ':d', 'd']
 */
export function escapedHalfProvider(options: TEscapedSplitOptions): IEscapedHalf {
  const [
    regexp,
    {
      meet,
      end,
    },
  ] = escapedSplitReader(options, 'escapedHalfProvider');

  function instance(input: string): [string, string, string] {
    return map(base(input), unslash) as [string, string, string];
  }

  const base = instance.base = (input: string): [string, string, string] => {
    let depth = 0;
    let stack: number[] | undefined;
    let m: RegExpExecArray | null;
    regexp.lastIndex = 0;
    while ((m = regexp.exec(input))) {
      if (!m[0]) {
        regexp.lastIndex++;
      } else if (m[2]) {
        depth = meet(
          stack || (stack = []), m[2], m.index, input,
        );
      } else if (m[3] !== undefined && !depth) {
        return [
          input.slice(0, m.index),
          input.slice(m.index),
          input.slice(m.index + m[0].length),
        ];
      }
    }
    depth && end(stack as number[], input);
    return [
      input,
      '',
      '',
    ];
  };

  return instance;
}
