# match — фильтр как данные

[English version](./README.md)

`fundamentool/match` (fundamentool D-086, lab D-042): одна грамматика фильтров для всех мест, где выбирают значения.
Шаблон — простые данные: агент пишет его в JSON, хранилище — в SQL, код один раз компилирует в предикат. Своих слов,
кроме `$`-операторов, у грамматики нет, а операторы — реестр, который проект расширяет (lab D-044: ядро и пресеты).

```ts
import { matchProvider, normalizeMatch, isMatch, STANDARD_OPERATORS, type TMatch, type TMatchOperator } from 'fundamentool/match';

const isOpen = matchProvider([
  { kind: 'decision', status: ['proposed', 'provisional'], $not: { affects: { $has: 'USER_DRAFT' } } },
  { kind: 'decision', status: 'active', accepted: { $gte: '2026-10-30' } },
]);
isOpen({ kind: 'decision', status: 'proposed', affects: ['packages/kit/'] });               // true
isOpen({ kind: 'decision', status: 'active', accepted: '2026-10-28 12:46 MSK' });           // false
isOpen({ kind: 'decision', status: 'proposed', affects: ['LABARATORY/USER_DRAFT/x.md'] });  // false
records.filter(isOpen);
```

| Член | Что это |
|------|---------|
| `matchProvider(pattern, options?)` | Компилирует шаблон один раз; возвращает `(value) => boolean`. Плохой шаблон бросает здесь, а не при проверке |
| `normalizeMatch(pattern, options?)` | Шаблон деревом (`TMatchNode`) без сокращений — для `fundamentool/sql` и планировщика хранилища |
| `isMatch(value, pattern)` | Разовая форма; объектный шаблон компилируется при первом вызове и хранится (есть и в `fundamentool`, и в `fundamentool/is`) |
| `STANDARD_OPERATORS` | Реестр по умолчанию; разверните его, чтобы добавить свои |
| `TMatchOperator` | Одна запись реестра: `check`, `prepare`, `test`, `negationOf` |
| `matchTypeOf(value)`, `MATCH_TYPES` | Имена типов для `$type` |

## Грамматика

| Записано | Значит |
|----------|--------|
| `[p1, p2]` | любой из шаблонов; `[]` не подходит ни под что |
| `{ a: …, b: … }` | каждый ключ; сравниваются только ключи шаблона; `{}` — любой объект (и массив) |
| `{ a: 5 }` | `a` равно 5 — или `a` массив, содержащий 5 |
| `{ a: [x, y] }` | `a` — любое из них, или массив, содержащий любое из них |
| `{ a: { b: 1 } }` | `b` внутри `a` подходит под 1 — частично, как раньше |
| `{ a: { $gte: 1, $lt: 5 } }` | для `a` выполняется каждый оператор |
| `{ a: /x/i }` | `a` — строка, в которой RegExp что-то находит |
| `{ $or: [p1, p2] }` | или — рядом с полями того же объекта |
| `{ $not: p }` | `p` не выполняется |

Один способ записать каждое (lab D-016):

- Равно одному значению: `{ a: 1 }`. `$eq` — только чтобы сравнить значение целиком (массив с массивом, объект с
  ключами на `$`).
- Любое из значений: список. `$in` — только рядом с другим оператором: `{ a: { $in: [1, 2], $ne: 3 } }`.
- Два условия на одно поле: один объект операторов, `{ $gte, $lt }`. `$and` нет.

**Значения.** `null` подходит только под `null`. `NaN` подходит под `NaN`. `Date` сравниваются по времени. `undefined`
считается отсутствием, так что `{ a: undefined }` подходит под `{}`. `Map` или экземпляр класса в шаблоне сравнивается
целиком (`$eq`), а экземпляр класса как значение читается по собственным ключам.

**Массивы по пути.** Поле под массивом — поле любого элемента: `{ items: { id: 2 } }` подходит под
`{ items: [{ id: 1 }, { id: 2 }] }`. Числовой сегмент ещё и берёт элемент по индексу, как в Mongo: `{ items: { 0: { id: 2 } } }`
подходит, если у первого элемента `id: 2` или если у какого-то элемента есть собственный ключ `"0"` с `{ id: 2 }`.

**Отрицания** — про весь массив. `{ tags: { $ne: 'a' } }` значит «ни один тег не `'a'`», поэтому не подходит под
`{ tags: ['a', 'b'] }`. `{ items: { id: { $exists: false } } }` значит «ни у одного элемента нет `id`».

## Стандартные операторы

| Оператор | Выполняется, когда значение… | Аргумент |
|----------|------------------------------|----------|
| `$eq` | глубоко равно ему (`Date` по времени); массив — или содержит его | любой |
| `$ne` | не равно — записывается как `$not` от `$eq` | любой |
| `$in` | равно любому из них | список |
| `$gt` `$gte` `$lt` `$lte` | больше / меньше: числа с числами, строки со строками, `Date` по времени; между типами — никогда; массив — любой элемент | число, строка или `Date` |
| `$has` | строка содержит его без учёта регистра (`'МИНУТ'` находит `минут`); массив содержит его или его строка содержит | строка; для массивов любое значение |
| `$regex` | строка, в которой RegExp что-то находит (`g` и `y` отброшены, чтобы один RegExp отвечал одинаково при каждом вызове) | RegExp или `[source, flags]` для JSON |
| `$exists` | есть (`true`) или нет (`false`, записывается как `$not` от `true`) | булево |
| `$type` | одного из типов: `string`, `number`, `boolean`, `bigint`, `undefined`, `null`, `array`, `object`, `function`, `symbol` | тип или список |

Строки сравниваются как текст, поэтому ISO-даты и лабораторные `2026-10-30 11:14 MSK` правильно упорядочиваются
через `$gte` / `$lt`.

## Свой оператор

Оператор — запись реестра. `check` отвергает неверный аргумент при компиляции. `prepare` один раз превращает аргумент
в то, что нужно `test`. `test` вызывается на каждое значение.

```ts
const WITHIN: TMatchOperator<string, number> = {
  check: (a) => (typeof a === 'string' && /^\d+[mhd]$/.test(a) ? undefined : 'a duration like "2h"'),
  prepare: (a) => Date.now() - durationMs(a),
  test: (value, since) => typeof value === 'string' && Date.parse(value) >= since,
};
const operators = { ...STANDARD_OPERATORS, $within: WITHIN };

const isRecent = matchProvider({ edited: { $within: '2h' } }, { operators });
isRecent({ edited: new Date().toISOString() }); // true

matchProvider({ edited: { $within: 2 } }, { operators });
// TypeError: [fundamentool/match] matchProvider: "$within" at edited expects a duration like "2h", got number 2
```

`prepare` выполняется при компиляции шаблона, так что `$within` отсчитывает от момента компиляции. Долгоживущий предикат
перекомпилируйте, чтобы сдвинуть «сейчас».

Оператор, который является отрицанием другого, говорит об этом через `negationOf`. Тогда ему не нужен `test`, а на
поле-массиве он значит «ни один из элементов»:

```ts
const $ne: TMatchOperator = { negationOf: (argument) => ['$eq', argument] };
```

Реестр заменяет стандартный, а не сливается с ним. Сокращению нужен его оператор в реестре: `{ a: 1 }` — `$eq`,
списку — `$in`, RegExp — `$regex`, `{}` — `$type`.

## Дерево — `normalizeMatch`

```ts
normalizeMatch({ kind: 'decision', status: ['proposed', 'provisional'], $not: { revised: { $exists: true } } });
// { kind: 'and', of: [
//   { kind: 'op', path: ['kind'], op: '$eq', argument: 'decision' },
//   { kind: 'op', path: ['status'], op: '$in', argument: ['proposed', 'provisional'] },
//   { kind: 'not', of: { kind: 'op', path: ['revised'], op: '$exists', argument: true } },
// ] }

normalizeMatch({ status: { $ne: 'cancelled' }, revised: { $exists: false } });
// { kind: 'and', of: [
//   { kind: 'not', of: { kind: 'op', path: ['status'], op: '$eq', argument: 'cancelled' } },
//   { kind: 'not', of: { kind: 'op', path: ['revised'], op: '$exists', argument: true } },
// ] }
```

Каждое значение становится `$eq`, список значений — `$in`, RegExp — `$regex`, `{}` — `$type`, вложенный объект —
более длинным `path`, отрицание — `not`, а список или объект из одного условия — самим этим условием. `matchProvider`
компилирует это же дерево. Диалект SQL пишет его, по одному обработчику на оператор (lab D-042).

## Ошибки

Шаблон может прийти из JSON, поэтому он проверяется при каждой компиляции. Опции — код, они проверяются только в
разработке (lab D-023).

```
matchProvider({ status: { $inn: ['a'] } })
TypeError: [fundamentool/match] matchProvider: unknown operator "$inn" at status. Did you mean "$in"? Operators: $eq, $ne, $in, $gt, $gte, $lt, $lte, $has, $regex, $exists, $type

matchProvider({ n: { $gt: {} } })
TypeError: [fundamentool/match] matchProvider: "$gt" at n expects a number, a string or a Date, got object

matchProvider({ a: { $gt: 1, b: 2 } })
TypeError: [fundamentool/match] matchProvider: the pattern at a mixes operators ($gt) and fields (b); a field whose name starts with $ is compared whole — { $eq: … } a level up

matchProvider({}, { operator: {} })
TypeError: [fundamentool/match] matchProvider: unknown option "operator". Did you mean "operators"?
```

Так же отвергаются шаблон, содержащий сам себя, и функция в шаблоне. Если `test` оператора бросает, ошибка называет
оператор и путь: `[fundamentool/match] "$within" at edited threw: …`.

## Не покрыто

- **Функции в шаблоне** (`{ a: (v) => v > 3 }`): не данные, для них нет ни SQL, ни JSON. Своя проверка — это оператор.
- **Один элемент с несколькими полями** (`$elemMatch` Mongo): `{ items: { id: 1, done: false } }` подходит под
  `{ items: [{ id: 1, done: true }, { id: 2, done: false }] }`, потому что каждое поле — поле любого элемента.
- **Пути через точку** (`'attrs.status'`): единственный способ — вложенность, `{ attrs: { status } }`. Точка — обычный
  символ имени поля.
- **Сортировка, проекция, лимиты**: остальное в запросе — дело `fundamentool/sql` и хранилища.

## Скорость

Замерено против `isMatch` до этого модуля, который обходил шаблон на каждом вызове. Скрипт —
`packages/benchmarks/src/matching/is-match.bench.ts`, числа — в
`LABARATORY/LAB_CONTEXT/BENCHMARKS/matching/is-match.md`.

| Случай | `matchProvider`, скомпилирован один раз | `isMatch`, хранится на шаблон |
|--------|-----------------------------------------|-------------------------------|
| два равных поля | примерно так же (0.91–1.45×) | 0.83–0.87× (поиск в `WeakMap` на вызов) |
| вложенное поле | 1.54–1.59× | 1.24–1.29× |
| первое поле отличается | 2.11–2.49× | 1.33–1.62× |

В цикле компилируйте один раз через `matchProvider`. `isMatch` — для разовой проверки.
