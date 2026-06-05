import { variantsProvider } from './variantsProvider';

/**
 * Разбор MN-выражения со скобками и `|`: экземпляр `variantsProvider` с `separator: '|'`, `scopeStart: '('`, `scopeEnd: ')'`, безлимитной `maxDepth`, **без** `maxOutputCount` (без лимита числа строк). Свой лимит — через `variantsProvider({ ..., maxOutputCount: n })`.
 *
 * @param exp — входная строка.
 * @param applyUnslash — при `false` первый элемент кортежа без `unslash` (по умолчанию эскейпы снимаются).
 * @returns Кортеж `[массив строк-вариантов, максимальная глубина вложенности scope]`.
 * @example
 * const [names, depth] = variants('P(eter|awel|atrik)');
 * // names => ['Peter', 'Pawel', 'Patrik'], depth => 1
 */
export const variants = variantsProvider({
  separator: '|',
  scopeStart: '(',
  scopeEnd: ')',
  maxDepth: Number.POSITIVE_INFINITY,
});
