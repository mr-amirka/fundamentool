export type ScopeNode = string | ScopeNode[];

/**
 * Splits a string into a nested tree of scopes using start/end tokens.
 *
 * Возвращает массив, состоящий из строк и вложенных массивов:
 *
 * - строки соответствуют тексту вне скобок на текущем уровне;
 * - вложенный массив представляет содержимое одной пары `openChar` / `closeChar`,
 *   внутри которого та же структура (строки и массивы).
 *
 * Многосимвольные разделители также поддерживаются.
 * 
 * @param input - The input string to split.
 * @param openChar - The open character.
 * @param closeChar - The close character.
 * @returns The split scope.
 * @example
 * scopeSplit('abc', '(', ')'); // => ['abc']
 * scopeSplit('a(b)c', '(', ')'); // => ['a', ['b'], 'c']
 * scopeSplit('a(b(c)d)e', '(', ')'); // => ['a', ['b', ['c'], 'd'], 'e']
 * scopeSplit('pre{{x}}post', '{{', '}}'); // => ['pre', ['x'], 'post']
 */
export function scopeSplit(
  input: string,
  openChar = '(',
  closeChar = ')'
): ScopeNode[] {
  const openCharLength = openChar.length;
  const closeCharLength = closeChar.length;
  const inputLength = input.length;
  const rootLevel: ScopeNode[] = [];
  const levels: ScopeNode[][] = [rootLevel];
  let level: ScopeNode[] = rootLevel;
  let prevLevel: ScopeNode[] = rootLevel;
  let depth = 0;
  let offset = 0;
  let i = 0;
  let value = '';

  while (i < inputLength) {
    if (openChar === input.slice(i, i + openCharLength)) {
      value = input.slice(offset, i);
      value && level.push(value);
      i = offset = i + openCharLength;
      depth++;
      prevLevel = level;
      level = levels[depth] = [];
      prevLevel.push(level);
      continue;
    }

    if (closeChar === input.slice(i, i + closeCharLength)) {
      value = input.slice(offset, i);
      value && level.push(value);
      i = offset = i + closeCharLength;
      depth--;
      level = levels[depth];
      continue;
    }

    i++;
  }

  if (depth) {
    throw new Error(`Scope syntax error: "${input}", depth: ${depth}`);
  }

  if (offset < inputLength) {
    rootLevel.push(input.slice(offset));
  }

  return rootLevel;
}