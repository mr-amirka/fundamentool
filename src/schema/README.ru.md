# schema — что принимает точка входа, описанное один раз

[English version](./README.md)

`fundamentool/schema` (fundamentool D-051): опции фабрики как схема — из неё проверка, тип (`TInfer`) и список ключей.
**Проверка опций работает только в разработке** (lab D-023): продакшен-сборка выбрасывает её, схему и эту библиотеку —
см. «Только в разработке» ниже.
**Имена и поведение zod**, с правилами лаборатории (`api-input-validation.md`): неизвестный ключ — ошибка с «did you
mean» (zod его отбрасывает — единственное отличие, намеренное); сообщения «… expects …, got …».

```ts
import { lazy, object, array, tuple, string, boolean, func, unknown, type TInfer } from 'fundamentool/schema';
// или: import * as schema from 'fundamentool/schema'; schema.object(…) — то же, и так же мало в бандле

// Строится при первом использовании — pure-аннотация даёт продакшен-сборке выбросить её целиком
export const HOST_OPTIONS = /*#__PURE__*/ lazy(() => {
  const row = object({
    main: unknown(),
    keep: boolean().optional(),
  }).passthrough();                                       // свои поля приложения разрешены
  return object({
    routes: array(tuple([string(), row]).label((r) => `the row "${r[0]}"`)),
    render: func().optional(),
  }).refine((options) => options.render !== undefined || options.routes.every(([, r]) => r.main !== undefined),
    'a row without "main" needs a "render"');
});

export type THostOptions = TInfer<ReturnType<typeof HOST_OPTIONS>>; // тип — из схемы
// список ключей — из схемы, там, где тест сверяет его с типом: HOST_OPTIONS().keys

export function createHost(options: THostOptions) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    HOST_OPTIONS().parse(options, '[app] createHost');
  }
  // …
}
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
| `lazy(() => schema)` | схема, построенная при первом использовании (lab D-023) |

## Только в разработке (lab D-023)

Проверка того, что разработчик пишет в коде — опций точки входа, аргументов вызова, — пишется за режимом сборки, а её
схема строится при первом использовании:

```ts
const OPTIONS = /*#__PURE__*/ lazy(() => object({ quiet: boolean().optional() }));

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  OPTIONS().parse(options, WHERE);
}
```

Продакшен-сборка приложения (Vite, webpack, Next.js, esbuild с `--minify`) подставляет `"production"`: ветка, схема и эта
библиотека уходят из бандла — в коде приложения и во всех зависимостях, без настроек. В разработке и тестах проверки
работают как прежде; страница без сборщика (нет `process`) их пропускает. Нужны обе части, замерено в lab research 13:
схема, построенная в начале модуля, остаётся, даже когда её никто не использует, а esbuild выбрасывает `lazy(…)` только с
pure-аннотацией. Правило линтера `lab/dev-only-checks` (eslint-config-lab) сообщает о проверке вне ветки и о схеме,
построенной при загрузке модуля.

Проверка **данных, приходящих во время работы** — адреса, хранилища, сети, того, что ввёл пользователь, — не ошибка кода:
она остаётся всегда и говорит об этом: `// eslint-disable-next-line lab/dev-only-checks -- <какие данные проверяет>`.
