# match — a filter as data

[Русская версия](./README.ru.md)

`fundamentool/match` (fundamentool D-086, lab D-042): one grammar of filters for every place that picks values. A
pattern is plain data, so an agent writes it as JSON, a store writes it as SQL, and code compiles it once into a
predicate. The grammar has no words of its own besides `$`-operators, and the operators are a registry a project
extends (lab D-044: a core and presets).

## When you need it

- Filter records by a pattern written as data — JSON a person or an agent writes: equal, one of a list, ranges,
  `$not`, nested fields (as MongoDB's queries).
- Compile a filter once and test many values fast.
- The same filter in memory and in SQL (through `fundamentool/sql`), giving the same rows.
- Operators of your own added to the grammar.

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

| Member | What it is |
|--------|-----------|
| `matchProvider(pattern, options?)` | Compiles the pattern once; returns `(value) => boolean`. A bad pattern throws here, never at testing |
| `normalizeMatch(pattern, options?)` | The pattern as a tree (`TMatchNode`), every shorthand gone — for `fundamentool/sql` and a store's planner |
| `isMatch(value, pattern)` | The one-shot form; an object pattern is compiled on first use and kept (also in `fundamentool` and `fundamentool/is`) |
| `STANDARD_OPERATORS` | The default registry; spread it to add your own |
| `TMatchOperator` | One registry entry: `check`, `prepare`, `test`, `negationOf` |
| `matchTypeOf(value)`, `MATCH_TYPES` | The type names `$type` uses |

## The grammar

| Written | Means |
|---------|-------|
| `[p1, p2]` | any of the patterns; `[]` matches nothing |
| `{ a: …, b: … }` | every key; only the pattern's keys are compared; `{}` matches any object (arrays too) |
| `{ a: 5 }` | `a` equals 5 — or `a` is an array holding 5 |
| `{ a: [x, y] }` | `a` is any of these — or an array holding any of them |
| `{ a: { b: 1 } }` | `a`'s `b` matches 1 — partially, as before |
| `{ a: { $gte: 1, $lt: 5 } }` | every operator holds for `a` |
| `{ a: /x/i }` | `a` is a string the RegExp finds something in |
| `{ $or: [p1, p2] }` | or, beside fields of the same object |
| `{ $not: p }` | `p` doesn't hold |

One way to write each thing (lab D-016):

- Equal to one value: `{ a: 1 }`. Write `$eq` only to compare a whole value exactly (an array to an array, an object
  whose keys start with `$`).
- Any of values: a list. Write `$in` only beside another operator: `{ a: { $in: [1, 2], $ne: 3 } }`.
- Two conditions on one field: one operator object, `{ $gte, $lt }`. There is no `$and`.

**Values.** `null` matches only `null`. `NaN` matches `NaN`. `Date`s compare by time. `undefined` counts as absent, so
`{ a: undefined }` matches `{}`. A `Map` or a class instance in a pattern is compared whole (`$eq`), and a class instance
as a value is read by its own keys.

**Arrays on the way.** A field under an array is any element's: `{ items: { id: 2 } }` matches
`{ items: [{ id: 1 }, { id: 2 }] }`. A numeric segment also indexes the array, as in Mongo: `{ items: { 0: { id: 2 } } }`
matches when the first item has `id: 2`, or when an item has its own key `"0"` holding `{ id: 2 }`.

**Negations** are about the whole array. `{ tags: { $ne: 'a' } }` means none of the tags is `'a'`, so it doesn't match
`{ tags: ['a', 'b'] }`. `{ items: { id: { $exists: false } } }` means no item has an `id`.

## The standard operators

| Operator | Holds when the value… | Argument |
|----------|----------------------|----------|
| `$eq` | equals it deeply (`Date`s by time); an array — or holds it | any |
| `$ne` | doesn't — written as `$not` of `$eq` | any |
| `$in` | equals any of them | a list |
| `$gt` `$gte` `$lt` `$lte` | is greater / less: numbers with numbers, strings with strings, `Date`s by time; never across types; an array — any element | a number, a string or a `Date` |
| `$has` | a string holds it, case aside (`'МИНУТ'` finds `минут`); an array holds it, or a string of it does | a string; for arrays any value |
| `$regex` | is a string the RegExp finds something in (`g` and `y` dropped, so one RegExp answers the same every call) | a RegExp, or `[source, flags]` for JSON |
| `$exists` | is present (`true`) or absent (`false`, written as `$not` of `true`) | a boolean |
| `$type` | is of the type or types: `string`, `number`, `boolean`, `bigint`, `undefined`, `null`, `array`, `object`, `function`, `symbol` | a type or a list |

Strings compare as text, so ISO dates and the lab's `2026-10-30 11:14 MSK` order correctly with `$gte` / `$lt`.

## Adding an operator

An operator is an entry of the registry. `check` refuses a wrong argument at compiling. `prepare` turns the argument
into what `test` needs, once. `test` runs per value.

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

`prepare` runs when the pattern is compiled, so `$within` counts from the compile time. Recompile a long-lived
predicate to move "now".

An operator that is another one's negation says so with `negationOf`. It then needs no `test`, and on an array field it
means "none of the elements":

```ts
const $ne: TMatchOperator = { negationOf: (argument) => ['$eq', argument] };
```

The registry replaces the standard one, it doesn't merge with it. A shorthand needs its operator there: `{ a: 1 }` needs
`$eq`, a list `$in`, a RegExp `$regex`, `{}` `$type`.

## The tree — `normalizeMatch`

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

Each value becomes `$eq`, a list of values `$in`, a RegExp `$regex`, `{}` `$type`, a nested object a longer `path`, a
negation `not`, and a list or an object of one condition just that condition. `matchProvider` compiles this same
tree. A SQL dialect writes it, with one handler per operator (lab D-042).

## Mistakes

A pattern may come from JSON, so it is checked every time it is compiled. The options are code, so they are checked in
development only (lab D-023).

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

A pattern that holds itself, and a function in a pattern, are refused the same way. An operator's `test` that throws is
reported with its name and path: `[fundamentool/match] "$within" at edited threw: …`.

## Not covered

- **Functions in a pattern** (`{ a: (v) => v > 3 }`): not data, so there is no SQL and no JSON for them. A check of its
  own is an operator.
- **One element holding several fields** (Mongo's `$elemMatch`): `{ items: { id: 1, done: false } }` matches
  `{ items: [{ id: 1, done: true }, { id: 2, done: false }] }`, because each field is any element's.
- **Dotted paths** (`'attrs.status'`): nesting is the one way, `{ attrs: { status } }`. A dot is an ordinary character of
  a field name.
- **Sorting, projection, limits**: the rest of a query belongs to `fundamentool/sql` and to the store.

## Speed

Measured against `isMatch` before this module, which walked the pattern on every call. The script is
`packages/benchmarks/src/matching/is-match.bench.ts` and the numbers are in
`LABARATORY/LAB_CONTEXT/BENCHMARKS/matching/is-match.md`.

| Case | `matchProvider`, compiled once | `isMatch`, kept per pattern |
|------|-------------------------------|-----------------------------|
| two equal fields | about the same (0.91–1.45×) | 0.83–0.87× (a `WeakMap` lookup per call) |
| a nested field | 1.54–1.59× | 1.24–1.29× |
| the first field differs | 2.11–2.49× | 1.33–1.62× |

In a loop, compile once with `matchProvider`. `isMatch` suits a single check.
