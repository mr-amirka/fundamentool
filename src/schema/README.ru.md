# schema — что принимает точка входа, описанное один раз

[English version](./README.md)

`fundamentool/schema` (fundamentool D-051): опции фабрики как схема — из неё проверка, тип (`TInfer`) и список ключей.
**Имена и поведение zod**, с правилами лаборатории (`api-input-validation.md`): неизвестный ключ — ошибка с «did you
mean» (zod его отбрасывает — единственное отличие, намеренное); сообщения «… expects …, got …».

```ts
import { object, array, tuple, string, boolean, func, unknown, type TInfer } from 'fundamentool/schema';
// или: import * as schema from 'fundamentool/schema'; schema.object(…) — то же, и так же мало в бандле

const ROW = object({
  main: unknown(),
  keep: boolean().optional(),
}).passthrough();                                         // свои поля приложения разрешены

export const HOST_OPTIONS = object({
  routes: array(tuple([string(), ROW]).label((row) => `the row "${row[0]}"`)),
  render: func().optional(),
}).refine((options) => options.render !== undefined || options.routes.every(([, row]) => row.main !== undefined),
  'a row without "main" needs a "render"');

export type THostOptions = TInfer<typeof HOST_OPTIONS>;   // тип — из схемы
export const HOST_OPTION_KEYS = HOST_OPTIONS.keys;        // список ключей — из схемы

HOST_OPTIONS.parse(options, '[app] createHost');
```

Что видит разработчик:

```
{ routes: [['/x', { main: X, keep: 1 }]] }  → TypeError: [app] createHost: the row "/x": "keep" expects true or false, got number 1
{ routes: [], rendr: draw }                  → TypeError: [app] createHost: unknown option "rendr". Did you mean "render"?
{ routes: 'oops' }                           → TypeError: [app] createHost: "routes" expects a list, got string "oops"
```

Не деструктурируйте объект-пространство (`const { object } = schema`) — тогда бандлер оставит весь модуль.

| Член | Что принимает |
|------|---------------|
| `string()`, `boolean()`, `func()`, `unknown()` | вид одного значения |
| `number()` + `.min(n)`, `.int()`, `.finite()` | число (не `NaN`) |
| `literal(value)`, `oneOf(values \| () => values)` | ровно значение; одну из строк (близкая — «did you mean») |
| `custom(check, expected)` | что примет проверка (`isStore`) |
| `union([a, b])` | первое подходящее |
| `array(item)`, `tuple([a, b])`, `record(value)` | список, фиксированные места, `{ [имя]: значение }` |
| `object(shape)` + `.passthrough()`, `.keys` | объект опций |
| `.optional()`, `.refine(rule, message)`, `.describe(expected)`, `.label(name)` | у любой схемы |
| `.parse(value, where)`, `.safeParse(value)`, `TInfer<typeof S>` | проверка, без исключения, тип |
