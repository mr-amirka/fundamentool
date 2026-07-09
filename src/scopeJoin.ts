import {
  joinOnly, 
} from './join/joinOnly';

type ScopeNode = string | ScopeNode[];

/**
 * Joins a nested scope tree back into a string using the given delimiters.
 *
 * На вход подаётся структура, аналогичная результату `scopeSplit`:
 * массив, содержащий строки и вложенные массивы (поддеревья скобок).
 *
 * - Строки добавляются в результат как есть.
 * - Вложенный массив оборачивается `openChar` / `closeChar` и
 *   рекурсивно разворачивается вовнутрь.
 *
 * Совместим по форме с `scopeSplit`, но не навязывает конкретный формат узлов
 * (любой `ScopeNode[]`, где строки и вложенные массивы чередуются).
 * 
 * @param scope - The scope to join.
 * @param openChar - The open character.
 * @param closeChar - The close character.
 * @returns The joined scope.
 * @example
 * scopeJoin(['a', ['b'], 'c']); // => 'a(b)c'
 * scopeJoin(['a', ['b', ['c'], 'd'], 'e']); // => 'a(b(c)d)e'
 * scopeJoin(['pre', ['inner'], 'post'], '{{', '}}'); // => 'pre{{inner}}post'
 */
export function scopeJoin(
  scope: ScopeNode[],
  openChar: string = '(',
  closeChar: string = ')',
): string {
  const output: string[] = [];

  base(scope);
  return joinOnly(output);

  function base(nodes: ScopeNode[]): void {
    const length = nodes.length;
    let i = 0;
    let node: ScopeNode;
    for (; i < length; i++) {
      node = nodes[i];
      if (typeof node === 'string') {
        output.push(node);
      } else {
        output.push(openChar);
        base(node);
        output.push(closeChar);
      }
    }
  }
}
