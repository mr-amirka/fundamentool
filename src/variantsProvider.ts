import {
  escapedSplitProvider, 
} from './escapedSplitProvider';
import {
  joinArrays, 
} from './join/joinArrays';
import {
  joinOnly, 
} from './join/joinOnly';
import {
  unslash, 
} from './unslash';

export type TVariantsResult = readonly [strings: string[], maxDepth: number];

/**
 * Функция разбора: строка выражения и опционально отключение `unslash` для сырого вывода.
 * @returns Кортеж `[массив вариантов, максимальная глубина вложенности scope]`.
 */
export type TVariants = (value: string, applyUnslash?: boolean) => TVariantsResult;

export interface IVariantsProviderOptions {
  /** Разделитель альтернатив внутри группы (в MN по умолчанию `|`). Может быть подстрокой — см. `escapedSplitProvider`. */
  separator: string;
  /** Открывающая граница группы (в MN по умолчанию `(`). Допускается любая непустая подстрока. */
  scopeStart: string;
  /** Закрывающая граница группы (в MN по умолчанию `)`). Допускается любая непустая подстрока, отличная от `scopeStart`. */
  scopeEnd: string;
  /**
   * Максимальная глубина вложенности пар scope.
   * `Number.POSITIVE_INFINITY` — без ограничения.
   * Любое конечное `<= 0` (в т.ч. отрицательные) — как `0`: группы запрещены.
   * `NaN` — ошибка при создании провайдера (`TypeError`).
   * Конечное `> 0` — лимит уровней. Удобно, если то же поле приходит из внешнего конфига в широком диапазоне без отдельной нормализации под этот модуль.
   */
  maxDepth: number;
  /**
   * Верхняя граница **числа строк** в результате развёртки (длина массива до `unslash`).
   * `undefined` / `Number.POSITIVE_INFINITY` — без ограничения.
   * Конечное `<= 0` — как `0` (любая непустая развёртка — ошибка при вызове).
   * `NaN` — `TypeError` при создании фабрики.
   * При превышении лимита — `RangeError` на вызове возвращаемой функции (после полной сборки массива строк в `variantsBuildSplit`).
   */
  maxOutputCount?: number;
}

export type VariantsChild = [string, VariantsChild[]];


/** Дискриминант логического токена разбора scope (числа — без строковых тегов). */
const SCOPE_PREFIX = 0;
const SCOPE_OPEN = 1;
const SCOPE_CLOSE = 2;

/** Логическая форма токена (разбор встроен в цикл — отдельный поток кортежей не строится). */
export type TScopeToken =
  | readonly [typeof SCOPE_PREFIX, string]
  | readonly [typeof SCOPE_OPEN]
  | readonly [typeof SCOPE_CLOSE];


function maxLimitNormalize(value: unknown,
  label: string): number {
  const type = typeof value;
  switch (type) {
    case 'number': {
      const n = value as number;
      if (Number.isNaN(n)) {
        throw new TypeError(`${label} must not be NaN`);
      }
      return n > 0 ? n : 0;
    }
    case 'undefined':
      return Number.POSITIVE_INFINITY;
    case 'object':
      if (value === null) {
        return Number.POSITIVE_INFINITY;
      }
      break;
    default:
      break;
  }
  throw new TypeError(`${label} must be a number, got ${type}, value: ${String(value)}`);
}

/**
 * Фабрика разборщика вариантов: один раз готовит сплиттер по `separator` и порядок маркеров scope;
 * на каждом вызове возвращаемой функции — один проход по строке без генератора и без аллокаций
 * на токены `OPEN`/`CLOSE` (только накопление префиксных фрагментов в `parts`).
 *
 * Семантика совпадает с экспортом **`variants`** из `./variants` (тот же набор опций MN по умолчанию); `variants` — готовая фабрика, возвращающая кортеж `[строки, maxDepth]`.
 *
 * Правила совпадения с 1.x для `(` `)`:
 * - `\\` + символ — один литерал префикса;
 * - иначе границы (сначала более длинная подстрока, при равной длине — `scopeStart`, затем `scopeEnd`), иначе один символ префикса.
 *
 * @param options - Разделитель, границы scope и лимиты глубины/размера результата.
 * @returns Функция `(value, applyUnslash?) => [строки, maxDepth]`.
 * @example
 * const variants = variantsProvider({ separator: '|', scopeStart: '(', scopeEnd: ')', maxDepth: 5 });
 * variants('a(b|c)'); // => [['ab', 'ac'], 1]
 */
export function variantsProvider(options: IVariantsProviderOptions): TVariants {
  const {
    scopeStart, scopeEnd, 
  } = options;

  const scopeStartLength = scopeStart.length;
  const scopeEndLength = scopeEnd.length;
  
  if (typeof scopeStart !== 'string' || scopeStartLength < 1) {
    throw new TypeError('scopeStart must be a non-empty string');
  }
  if (typeof scopeEnd !== 'string' || scopeEndLength < 1) {
    throw new TypeError('scopeEnd must be a non-empty string');
  }
  if (scopeStart === scopeEnd) {
    throw new TypeError('scopeStart and scopeEnd must differ');
  }
  
  const splitBySep = escapedSplitProvider(options.separator).base;

  const maxDepthLimit = maxLimitNormalize(options.maxDepth, 'maxDepth');
  const maxOutputCountLimit = maxLimitNormalize(options.maxOutputCount, 'maxOutputCount');

  /** Маркер, вид границы, длина — длина вычисляется один раз при создании фабрики. */
  const ordered: readonly [
    string,
    typeof SCOPE_OPEN | typeof SCOPE_CLOSE,
    number,
  ][] =
    scopeStartLength >= scopeEndLength
      ? [[
        scopeStart,
        SCOPE_OPEN,
        scopeStartLength,
      ], [
        scopeEnd,
        SCOPE_CLOSE,
        scopeEndLength,
      ]]
      : [[
        scopeEnd,
        SCOPE_CLOSE,
        scopeEndLength,
      ], [
        scopeStart,
        SCOPE_OPEN,
        scopeStartLength,
      ]];

  /**
   * Сборка дерева вариантов по уже разобранным `childs`.
   * При конечном `maxOutputCount` длина результата проверяется один раз после сборки.
   */
  function variantsBuildSplit(childs: VariantsChild[]): string[] {
    /*
     * Узел: [текст до вложенных scope, дети]. Текст режется по separator на альтернативы parts[0]…parts[end].
     * Последняя альтернатива parts[end] склеивается с развёрткой вложенного дерева (рекурсия); остальные
     * альтернативы участвуют как отдельные варианты или как префиксы к декартову произведению с `prev`.
     * `output` — «готовые» строки слева; `prev` — текущий набор префиксов для следующего шага.
     */
    const length = childs.length;
    const output: string[] = [];
    let parts: string[];
    let child: VariantsChild;
    let end: number;
    let pi: number;
    let pl: number;
    let next: string[];
    let prev: string[] = [''];

    for (let i = 0; i < length; i++) {
      child = childs[i];
      parts = splitBySep(child[0]);
      pl = parts.length;
      end = pl - 1;
      joinArrays(
        [parts[end]], variantsBuildSplit(child[1]), '', (next = []),
      );
      if (end) {
        joinArrays(
          prev, [parts[0]], '', output,
        );
        prev = next;
        for (pi = 1; pi < end; pi++) {
          output.push(parts[pi]);
        }
      } else {
        prev = joinArrays(prev, next);
      }
    }

    const strings = [...output, ...prev];

    if (strings.length > maxOutputCountLimit) {
      throw new RangeError(`variantsProvider: variant count exceeds maxOutputCount (${String(maxOutputCountLimit)})`);
    }

    return strings;
  }

  return (value: string, applyUnslash?: boolean): TVariantsResult => {
    const levels: Record<number, VariantsChild[]> = {};
    const childs = levels[0] = [];
    let depth = 0;
    let parts: string[] = [];
    let maxDepthSeen = 0;
    let last: VariantsChild;

    const exp = value;
    let i = 0;
    const len = exp.length;
    const orderedLen = ordered.length;

    let mi: number;
    let row: (typeof ordered)[number];
    let marker: string;
    let kind: typeof SCOPE_OPEN | typeof SCOPE_CLOSE;
    let ml: number;
    let matched: boolean;

    /*
     * Один проход по `exp`: накапливаем литералы в `parts`, на границах scope — сбрасываем в новый
     * `VariantsChild` в `levels[depth]`. OPEN увеличивает `depth` и переключает запись в `last[1]`;
     * CLOSE добавляет сегмент и уменьшает `depth`. Маркеры сравниваются в порядке `ordered` (см. выше).
     */
    while (i < len) {
      if (exp[i] === '\\') {
        if (i + 1 < len) {
          parts.push(exp.slice(i, i + 2));
          i += 2;
        } else {
          parts.push('\\');
          i += 1;
        }
        continue;
      }

      matched = false;
      for (mi = 0; mi < orderedLen; mi++) {
        row = ordered[mi];
        marker = row[0];
        kind = row[1];
        ml = row[2];
        if (i + ml > len) {
          continue;
        }
        if (ml === 1 ? exp[i] !== marker[0] : !exp.startsWith(marker, i)) {
          continue;
        }
        matched = true;
        if (kind === SCOPE_OPEN) {
          if (depth >= maxDepthLimit) {
            throw new RangeError(`variantsProvider: nesting exceeds maxDepth (${String(maxDepthLimit)})`);
          }
          levels[depth] = levels[depth] || [];
          last = [joinOnly(parts), []];
          levels[depth].push(last);
          depth++;
          if (depth > maxDepthSeen) {
            maxDepthSeen = depth;
          }
          levels[depth] = last[1];
        } else {
          levels[depth].push([joinOnly(parts), []]);
          /* Лишняя закрывающая скобка: не уходим в отрицательную глубину (как в 1.x). */
          if (--depth < 0) {
            depth = 0;
          }
        }
        parts = [];
        i += ml;
        break;
      }
      if (matched) {
        continue;
      }

      parts.push(exp[i]);
      i += 1;
    }

    if (parts.length) {
      levels[depth].push([joinOnly(parts), []]);
    }

    const strings = variantsBuildSplit(childs);

    return [applyUnslash === false ? strings : strings.map(unslash), maxDepthSeen] as const;
  };
}
