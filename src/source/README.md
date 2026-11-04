# source — strings from source code

[Русская версия](./README.ru.md)

`fundamentool/source` (fundamentool D-097) reads static strings from code without running it: the classes of a
component, test ids, route paths, the keys of `t('…')`. It also blanks comments, splits a single-file component into
its parts, and applies edits by positions.

The core knows the languages and how to read them. **What a string becomes is the caller's**: each reader writes into
the caller's list through the caller's `push`. minotation's `push` splits a class list into tokens; another caller
pushes the string whole.

```ts
import {
  blankComments, expressionStrings, sourceStringsProvider, sfcParts, blankSpan, applyEdits,
  parseSource, syntaxStringsProvider, syntaxValueRanges,
} from 'fundamentool/source';

const out: string[] = [];
const push = (list: string[], text: string) => {
  list.push(text);
};

// The strings an expression can be: both branches, the right of &&, both sides of || and ??.
expressionStrings("v === 'splash' ? 'bg1 cF' : 'fx1' }", 0, out, push);   // out: ['bg1 cF', 'fx1']

// The strings at places by name, `*Ending` for a pattern. Made once (checked in development), run per file.
const strings = sourceStringsProvider({
  attrs: ['class', 'className', '*ClassName'],   // class="…", className={…}, { className: '…' }
  variables: ['*Class'],                         // const rowClass = '…', { rowClass: '…' }
  calls: ['mne', '*Class'],                      // mne(base, 'p10'), thClass('w150')
});
strings(blankComments(source), out, push);       // comments first, if they shouldn't count

// The same by TypeScript's parser, which the caller gives: fundamentool imports no `typescript`.
import ts from 'typescript';
const file = parseSource(ts, source, 'App.tsx');   // undefined — a syntax error; read it as text then
const syntaxStrings = syntaxStringsProvider(ts, { attrs: ['className'], calls: ['mne'] });
file && syntaxStrings(file, out, push);
syntaxValueRanges(ts, file, ['className']);        // each value's [from, to), for a writer

// A single-file component: 0 — markup, 1 — a TS script, 2 — a TSX script, in order, with no gaps.
sfcParts('<template><b/></template><script lang="ts">let a</script>');
// [[0, 0, 43], [1, 43, 48], [0, 48, 57]]

// Edits by the original's positions; overlapping ones are an error in development.
applyEdits('<b class="p">', [[10, 10, '_l ']]);   // '<b class="_l p">'
```

| Member | What it does |
|--------|--------------|
| `blankComments(source, out?, onComment?)` | `//`, `/* */`, `<!-- -->` as spaces, the length and the lines kept; strings skipped whole; `onComment(out, source, from, to)` reads each comment first |
| `blankSpan(source, from, to)` | a range as spaces, its line breaks kept |
| `expressionStrings(source, at, out, push)` | the strings an expression can be; → the position after it |
| `sourceStringsProvider(places)` | a reader `(source, out, push)` of the strings at `attrs`, `variables`, `calls` |
| `parseSource(ts, source, fileName?)` | the tree, or `undefined` for a syntax error; `.ts`/`.mts`/`.cts` without JSX, the rest as TSX |
| `syntaxStringsProvider(ts, places)` | the parser's twin of `sourceStringsProvider`: a reader `(file, out, push)` |
| `syntaxValueRanges(ts, file, names)` | the ranges of attributes' and object keys' values |
| `sfcParts(source)` | the parts of a `.vue`, `.svelte`, `.astro` file |
| `applyEdits(source, edits)` | edits `[from, to, text]`, built in one pass |
| `matchesName(name, patterns)`, `namePatternSource(pattern)` | the name patterns, for a caller's own search |

- **What an expression gives.** `cond ? 'a' : 'b'` — both; `x && 'a'` — `'a'`; `a || 'b'`, `a ?? 'b'` — both sides;
  a template — its static pieces and what its `${…}` can be. Not the condition: in `v === 'splash' ? …` the string
  `'splash'` is an operand of a comparison, and the reader cuts it back from `out`. A call, a property, a concatenation
  give nothing: their value is known only at run time. The text reader and the parser agree on one table of cases.
- **The strings as written.** The text reader pushes a string as it stands between its quotes (`'a\'b'` → `a\'b`);
  the parser pushes its value (`a'b`).
- **A text reader.** `blankComments` and `sourceStringsProvider` don't parse: a regular expression's literal (`/"/`) or
  a template nested in a `${…}` can mislead them. Where the file is JS or TS, the parser has no such cases.
- **Speed.** Module-level state and tuples; a provider builds its regular expressions and lists once; the parser's walk
  makes no function per node.
