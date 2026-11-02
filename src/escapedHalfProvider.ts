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
 * the separator, `value` is the tail. The options are {@link escapedSplitProvider}'s.
 *
 * @param options - The separator, the escape, the brackets.
 * @returns The helper: the parts unescaped, or as written with `.base`.
 * @example
 * const half = escapedHalfProvider({ separator: ':' });
 * half('key:value');        // => ['key', ':value', 'value']
 * half('key\\:name:value'); // => ['key:name', ':value', 'value']
 * escapedHalfProvider({ separator: ':', brackets: '[]' }).base('a[b:c]:d'); // => ['a[b:c]', ':d', 'd']
 */
export function escapedHalfProvider(options: TEscapedSplitOptions): IEscapedHalf {
  const [
    regexp,
    openings,
  ] = escapedSplitReader(options, 'escapedHalfProvider');

  function instance(input: string): [string, string, string] {
    return map(base(input), unslash) as [string, string, string];
  }

  const base = instance.base = (input: string): [string, string, string] => {
    let depth = 0;
    let m: RegExpExecArray | null;
    regexp.lastIndex = 0;
    while ((m = regexp.exec(input))) {
      if (!m[0]) {
        regexp.lastIndex++;
      } else if (m[2]) {
        depth += openings.indexOf(m[2]) > -1 ? 1 : -1;
      } else if (m[3] !== undefined && !depth) {
        return [
          input.slice(0, m.index),
          input.slice(m.index),
          input.slice(m.index + m[0].length),
        ];
      }
    }
    return [
      input,
      '',
      '',
    ];
  };

  return instance;
}
