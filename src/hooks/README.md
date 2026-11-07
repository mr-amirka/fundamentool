# hooks — named moments for presets

[Русская версия](./README.ru.md)

`fundamentool/hooks` (fundamentool D-087, lab D-042): the parts of an extension point (lab D-044). A host names the
moments where presets may act: before a write, after it, when a step has to be resolved, when a SQL node is written.
Presets add handlers to those moments. The core knows only the mechanism. Everything of a domain is in the presets,
and the project's own setup is a preset too.

## When you need it

- Let plugins (presets) act at named moments of a library — before a write, after a parse, when a value must be
  resolved — the core knowing nothing of their domain: an extension point, as webpack's tapable.
- Handlers that transform a value in turn; all of them told of an event; the first one to answer; a chain of wrappers.
- Plugins ordered by what they require of each other; hooks by key; a host's hooks by name.
- Handlers that may wait: [`fundamentool/async/hooks`](../async/hooks/README.md).

```ts
import { waterfallHook, eachHook, bailHook, namedHooks, orderPresets, presetSetup, type TPreset } from 'fundamentool/hooks';

const hooks = {
  normalize: waterfallHook<string>({ name: '[sql] normalize' }),
  afterParse: eachHook<TTree>({ name: '[documents] afterParse' }),
  quote: bailHook<string, string>({ name: '[sql] quote' }),
};

const off = hooks.normalize.add((text) => text.trim(), { by: 'presetTrim' });
const text = hooks.normalize.run(' SELECT 1 '); // 'SELECT 1': each handler's result goes to the next
hooks.afterParse.run(tree);                     // every handler is told
off();                                          // removed; a second call does nothing
```

These hooks are sync: `run` returns the value itself, and a handler returns its value. **Handlers that may wait** — a
store, the network, a file — take [`fundamentool/async/hooks`](../async/hooks/README.md): the same kinds by the same
names, `run` returns a promise, plus `parallelHook` (§ "Sync here, async there").

| Member | What it is |
|--------|-----------|
| `eachHook<T>()` | Every handler is told; none answers |
| `waterfallHook<T>()` | Each handler gets the previous one's result and may change it; `undefined` keeps it |
| `bailHook<T, R>()` | The first handler that answers (not `undefined`) is the answer |
| `chainHook<T, R>()` | Middleware: a handler calls `next` to reach the rest, or answers itself |
| `hookMap(create)` | Hooks by key, made on first use: a handler per SQL node kind |
| `namedHooks(hooks, where)` | A host's hooks by name for its presets; an unknown name says "did you mean" |
| `orderPresets(presets, options?)` | Presets in the order to set them up: each after those it `requires` |
| `presetSetup(preset)` | A preset's setup, whether it is a function or `{ name, setup }` |
| `hookError(name, by, error)` | The error a handler's throw becomes |

Every hook has `add(handler, { order?, by? })`, which returns its removal, plus `run` and `size`. `size` is the number of
handlers: a host whose hook has none may skip the work it would do for them.

## Which kind

| The moment | Kind | Example |
|------------|------|---------|
| others should know it happened | `each` | `afterWrite(change)` |
| others may change a value before it is used | `waterfall` | `beforeWrite(change)` adds a stamp |
| one of the others knows the answer | `bail` | `resolve(step)`: the preset that knows the step's kind |
| a handler must act before and after the rest, or replace one and still reach it | `chain` | a SQL dialect over the ANSI form |

One way for each (lab D-016). A value changed in turn is a `waterfall`, not a `chain` whose handlers all call
`next(changed)`. The first answer is a `bail`, not a `chain` whose handlers return without `next`. A `chain` handler that
forgets `next` stops the rest silently, so the other kinds don't ask for `next` at all.

## The order

There is one rule: **a later handler has the last word.**

| Kind | Who goes first | So a later preset… |
|------|----------------|--------------------|
| `each`, `waterfall` | the earliest added | …runs after, and in a waterfall sees and can change what the earlier ones did |
| `bail`, `chain` | the latest added | …is asked first, so it answers instead of an earlier one; in a chain it wraps the earlier ones and reaches them with `next` |

`order: 'pre'` puts a handler before all the others, and `'post'` after them. Within each group the rule above holds.
Say the handlers are added in this order: A, B (`post`), C, D (`pre`):

```
each / waterfall:  D, A, C, B
bail / chain:      D, C, A, B
```

A handler is added or removed by replacing the hook's list. A run reads the list it started with, so a handler that
removes itself, or adds another, doesn't change the run in progress.

## Chains and dialects

```ts
const nodes = hookMap((kind: string) => chainHook<TNode, string>({ name: `[fundamentool/sql] node "${kind}"` }));

nodes.for('json-get').add((n) => `json_extract(${n.of}, '$.${n.path.join('.')}')`, { by: 'sqlite' });
nodes.for('json-get').add((n, next) => (n.path.length === 1 ? `${n.of}->>'${n.path[0]}'` : next()), { by: 'postgres' });

nodes.for('json-get').run({ of: 'attrs', path: ['status'] }, fail);    // "attrs->>'status'"  — postgres answered
nodes.for('json-get').run({ of: 'attrs', path: ['a', 'b'] }, fail);    // "json_extract(attrs, '$.a.b')" — postgres went on
nodes.get('text-match');                                                // undefined: no preset brought it
```

`next()` goes on with the same value, and `next(other)` with another. `end` answers when every handler went on.

## Errors

A handler's error is never swallowed (lab D-044 point 6). It reaches the caller of `run` named by the hook and by who
added the handler, with the original as `cause`:

```
[documents] beforeWrite: the handler of presetLabRecords threw: Cannot read properties of undefined (reading 'attrs')
```

Without `by` it says "a handler threw", and without `name` the message starts with `hook`. The handlers after the one
that threw don't run. In a chain, an error coming out of `next` (another handler's, already named, or `end`'s) passes
through the outer handlers unchanged, so it is named once, where it happened.

The options are code, so they are checked in development only (lab D-023): an unknown key with "did you mean", an
`order` other than `pre` / `post`, a handler that isn't a function. `namedHooks` checks a name always, since an unknown
one couldn't run anyway.

## Sync here, async there

Two modules, one per mode (lab D-050, fundamentool D-091): a host picks one once, by what its handlers do.

| | `fundamentool/hooks` | `fundamentool/async/hooks` |
|-|----------------------|----------------------------|
| For | pure work on a hot path: the SQL compiler writing a node | handlers that may wait: a link checked before a write, a search index updated after it |
| `run` | returns the value | returns a promise of it |
| A handler | returns its value | returns a value or a promise — both are awaited alike |
| Kinds | `eachHook`, `waterfallHook`, `bailHook`, `chainHook` | the same four, and `parallelHook` — every handler at once |
| A host takes | only the sync code | only the async code, over the same core |

```ts
import { chainHook } from 'fundamentool/hooks';
const node = chainHook<TNode, string>({ name: '[fundamentool/sql] node "json-get"' });
node.run(n, fail);                                   // a string

import { waterfallHook } from 'fundamentool/async/hooks';
const beforeWrite = waterfallHook<TChange>({ name: '[documents] beforeWrite' });
beforeWrite.add(async (change) => (await linkExists(change.link) ? undefined : { ...change, link: undefined }));
const change = await beforeWrite.run(proposed);       // a promise
```

The handlers' list, the order, the removal, the run's own list and the error naming are this module's core; the
async module imports it, so both behave the same. `hookMap`, `namedHooks` and `orderPresets` don't depend on the mode
and take hooks of either.

## Presets

```ts
type TPreset<H> = ((host: H) => void) | { name: string; requires?: readonly string[]; setup(host: H): void };

const ordered = orderPresets([presetMain, presetHints, presetStandard], { where: '[documents] documentsProvider' });
// [presetHints, presetStandard, presetMain] — presetMain requires the other two
for (const preset of ordered) {
  presetSetup(preset)(host);
}
```

The order is stable. Other things equal, presets keep the order listed. A dependency moves up only as far as it must,
and a function preset stays in its place. `connected` holds the presets of earlier calls: they satisfy `requires`, and
the same object isn't returned again.

Every mistake is found before any `setup` runs:

| Mistake | Message (after `where`) |
|---------|-------------------------|
| not a list | `expects a list of presets, got object` |
| not a preset | `expects a preset — a function or { name, setup } — got null` |
| no name, no `setup` | `preset object: a preset object needs a "name"` · `preset "a": a preset object needs a "setup(host)" function` |
| `requires` not connected | `presetLabRecords requires "presetFieldLines", which is not connected. Connected presets: …` |
| a cycle | `presets require each other: presetA → presetB → presetA` |
| two objects, one name | `two different presets are named "x"` |

`orderPresets` checks `name`, `requires` and `setup` only. A host checks its own fields with its own schema (minotation
checks `notationMode` and `ecosystems`), so nothing of a domain is in the core.

## Not covered

- **A parallel bail** (Tapable's `AsyncParallelBailHook`): no host needs it yet; it would be a kind of its own in
  `fundamentool/async/hooks`, as `parallelHook` is.
- **Numeric priorities** (Tapable's `stage`, `before: 'name'`): `order` and a preset's `requires` cover the callers.
- **Interception of every call** (Tapable's `intercept`): a `pre` handler does it.
