# schema — what an entry point accepts, described once

[Русская версия](./README.ru.md)

`fundamentool/schema` (fundamentool D-051): a factory's options as a schema — the check, the type (`TInfer`) and the
key list come from it. **zod's names and behaviour**, with the lab's rules (`api-input-validation.md`): an unknown key is
an error with "did you mean" (zod strips it — the one difference, on purpose); messages "… expects …, got …".

```ts
import { object, array, tuple, string, boolean, func, unknown, type TInfer } from 'fundamentool/schema';
// or: import * as schema from 'fundamentool/schema'; schema.object(…) — the same, and as small in a bundle

const ROW = object({
  main: unknown(),
  keep: boolean().optional(),
}).passthrough();                                         // the app's own fields allowed

export const HOST_OPTIONS = object({
  routes: array(tuple([string(), ROW]).label((row) => `the row "${row[0]}"`)),
  render: func().optional(),
}).refine((options) => options.render !== undefined || options.routes.every(([, row]) => row.main !== undefined),
  'a row without "main" needs a "render"');

export type THostOptions = TInfer<typeof HOST_OPTIONS>;   // the type — from the schema
export const HOST_OPTION_KEYS = HOST_OPTIONS.keys;        // the key list — from the schema

HOST_OPTIONS.parse(options, '[app] createHost');
```

What a developer sees:

```
{ routes: [['/x', { main: X, keep: 1 }]] }  → TypeError: [app] createHost: the row "/x": "keep" expects true or false, got number 1
{ routes: [], rendr: draw }                  → TypeError: [app] createHost: unknown option "rendr". Did you mean "render"?
{ routes: 'oops' }                           → TypeError: [app] createHost: "routes" expects a list, got string "oops"
```

Don't destructure a namespace object (`const { object } = schema`) — a bundler then keeps the whole module.

| Member | What it accepts |
|--------|-----------------|
| `string()`, `boolean()`, `func()`, `unknown()` | one value's kind |
| `number()` + `.min(n)`, `.int()`, `.finite()` | a number (not `NaN`) |
| `literal(value)`, `oneOf(values \| () => values)` | exactly a value; one of strings (a near one — "did you mean") |
| `custom(check, expected)` | anything a check accepts (`isStore`) |
| `union([a, b])` | the first that fits |
| `array(item)`, `tuple([a, b])`, `record(value)` | a list, fixed places, `{ [name]: value }` |
| `object(shape)` + `.passthrough()`, `.keys` | an options object |
| `.optional()`, `.refine(rule, message)`, `.describe(expected)`, `.label(name)` | on any schema |
| `.parse(value, where)`, `.safeParse(value)`, `TInfer<typeof S>` | the check, without throwing, the type |
