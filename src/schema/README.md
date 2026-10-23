# schema — what an entry point accepts, described once

[Русская версия](./README.ru.md)

`fundamentool/schema` (fundamentool D-051): a factory's options as a schema — the check, the type (`TInfer`) and the
key list come from it. **A check of options runs only in development** (lab D-023): a production build drops it, the
schema and this library — see "Only in development" below.

**zod's names and behaviour**, with the lab's rules (`api-input-validation.md`): an unknown key is an error with "did
you mean" (zod strips it — the one difference, on purpose); messages "… expects …, got …".

```ts
import { lazy, object, array, tuple, string, boolean, func, unknown, type TInfer } from 'fundamentool/schema';
// or: import * as schema from 'fundamentool/schema'; schema.object(…) — the same, and as small in a bundle

// Built on first use — the pure annotation lets a production build drop it whole
export const HOST_OPTIONS = /*#__PURE__*/ lazy(() => {
  const row = object({
    main: unknown(),
    keep: boolean().optional(),
  }).passthrough();                                       // the app's own fields allowed
  return object({
    routes: array(tuple([string(), row]).label((r) => `the row "${r[0]}"`)),
    render: func().optional(),
  }).refine((options) => options.render !== undefined || options.routes.every(([, r]) => r.main !== undefined),
    'a row without "main" needs a "render"');
});

export type THostOptions = TInfer<ReturnType<typeof HOST_OPTIONS>>; // the type — from the schema
// the key list — from the schema, where a test compares it with the type: HOST_OPTIONS().keys

export function createHost(options: THostOptions) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    HOST_OPTIONS().parse(options, '[app] createHost');
  }
  // …
}
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
| `lazy(() => schema)` | a schema built on first use (lab D-023) |

## Only in development (lab D-023)

A check of what a developer writes in code — an entry point's options, a call's arguments — is written behind the build
mode, its schema built on first use:

```ts
const OPTIONS = /*#__PURE__*/ lazy(() => object({ quiet: boolean().optional() }));

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  OPTIONS().parse(options, WHERE);
}
```

An app's production build (Vite, webpack, Next.js, esbuild with `--minify`) writes `"production"` in: the branch, the
schema and this library leave the bundle — in the app's code and in every dependency, with no setting. Development and
tests run the checks as before; a page with no bundler (no `process`) skips them. Both parts are needed, measured in lab
research 13: a schema built at the top of a module stays even when nothing uses it, and esbuild drops a `lazy(…)` only
with the pure annotation. The lint rule `lab/dev-only-checks` (eslint-config-lab) reports a check outside the branch and
a schema built when the module loads.

A check of **data that arrives at run time** — an address, storage, the network, what a user typed — is not a mistake
in the code: it stays always, and says so: `// eslint-disable-next-line lab/dev-only-checks -- <the data it checks>`.
