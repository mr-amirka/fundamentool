# i18n — one locale per app, a set of messages per package

[Русская версия](./README.ru.md)

`fundamentool/i18n` (fundamentool D-060 – D-066). The app has **one locale** (`createLocale`); each package — a kit of
components, a game — has **its own set of messages** (`createMessages`), with its own files. A message is read by
**key** — `t(K.hud.moves, { count })` — and the key is always **a constant** of its set, never a bare string (D-066).

```
<set folder>/en.ts, ru.ts, de.ts …   the base (`as const`) and its translations — TypeScript
   ↓ build: lexicons() (fundamentool/i18n/vite) — or in memory: sourceOf()
virtual:lexicons                      the keys once + each locale's values by position; some locales inline
   ↓
createLocale → createMessages         the current locale (an Observable), switching; a set's t / parts / list …
   ↓
fundamentool (view): localeViewProvider useT, useLocale, LocaleProvider, <Text>
```

## The messages

```ts
// src/i18n/en.ts — the base: its keys and the names of its variables are the types
import type { TMessages } from 'fundamentool/i18n';
export const en = {
  menu: { play: 'Play' },
  hud: { moves: '{{count|one:# move|other:# moves}}' },          // a plural; # — the number, formatted
  level: { title: 'Level {{id}} ({{id|number}} of {{total}})' },  // one value as text and as a number
  shop: { price: 'Only {{price|currency:USD}}' },
  chat: { sent: 'Sent {{at|clock}}' },                            // |date[:short…] |clock |relative |list |percent
  tip: { hint: 'Tap <b>{{booster|t}}</b> to see the next step' }, // a tag; |t — the value is a key of the set
  booster: { hint: { name: 'Hint' } },
  praise: ['Excellent!', 'Wonderful!'],                          // a list — each language its own length
} as const satisfies TMessages;

// src/i18n/ru.ts — a translation: the same tree (a missing key is a compile error)
import type { TTranslation } from 'fundamentool/i18n';
import type { en } from './en';
export const messages: TTranslation<typeof en> = { /* … */ };
```

A messages file holds data only — it may import types, never values.

## The build — `fundamentool/i18n/vite`

```ts
// vite.config.ts
import { lexicons } from 'fundamentool/i18n/vite';
plugins: [lexicons({
  locales: LOCALES,                                            // the first is the base
  sets: {
    kit: { from: '@wg/components/i18n', override: './src/i18n/kit' },   // the app rewords some kit texts
    game: { from: './src/i18n' },
  },
  inline: 'all',                                               // or ['en', 'ru'] — the rest on demand; default: the base
})]
```

`virtual:lexicons` holds the keys' tree once (`[["menu", ["play"]], ["booster", [["hint", ["name"]]]]]`) and the
inline locales' values in its order (`["Play", "Hint"]`); every other locale is its own small chunk. Both carry the keys'
hash: a chunk of another build is refused. **A translation unlike its base fails the build** — a missing or extra key,
other variables, a plural without `other`. Needs Node 24+ (it reads the TypeScript files with Node's type stripping).

Declare the module for TypeScript once in the app:
```ts
declare module 'virtual:lexicons' {
  export const source: import('fundamentool/i18n').TLexiconSource;
}
```

## The runtime

```ts
import { source } from 'virtual:lexicons';
import { createLocale, createMessages } from 'fundamentool/i18n';
import type { en } from './i18n/en';                         // a type — the texts come from the source, not twice

export const locale = createLocale({ source, locales: LOCALES });
export const text = createMessages<typeof en>(locale, 'game');
export const K = text.keys;                                   // the one place of the keys (D-066)

await locale.select(locale.detect([settings.language, ...navigator.languages])); // the last select wins
locale.$locale.getState();                 // 'de' — always a locale whose texts are there
await locale.ready();                      // the boot screen waits for the player's language

text.t(K.hud.moves, { count: 3 });         // '3 moves'; ru — '3 хода'
text.t(K.hud.moves, { count: '3' });       // the same: values are converted where the message needs them (D-062)
text.t('hud.moves', { count: 3 });         // ❌ compile error: a bare string isn't a key
text.t(K.hud.moves);                       // ❌ compile error: `count` isn't passed
text.translate('ru', K.menu.play);         // another locale ('Играть') — a bot answering two chats
text.parts(K.tip.hint, { booster: K.booster.hint.name }); // [{ text: 'Tap ' }, { text: 'Hint', tag: 'b' }, …]
text.list(K.praise);                       // ['Excellent!', 'Wonderful!']
text.has(serverKey);                       // a key from the server → a typed key
text.format.number(12345);                 // '12,345' — .currency, .percent, .date, .clock, .relative, .list
locale.pick({ en: 'Forest', ru: 'Лес' });  // content with its own translations
```

**A value that can't be shown** (`{ count: 'many' }`, a missing variable, an unknown key): in development — an error
naming the message, the variable, what was expected and what came; in production — the value as it is and one warning.
A translation missing a text shows the base's (development warns once per locale).

`createI18n({ source, locales })` — `createLocale` + the only set, for an app with one set of texts.
`sourceOf({ game: { en, ru } }, 'en')` — the same source in memory: tests, Node, an app built without Vite.

## React — `fundamentool` (its view bindings)

```tsx
const { useT, useLocale, LocaleProvider, Text } = localeViewProvider(React);

function Moves({ count }: { count: number }) {
  const t = useT(text);                                       // re-renders when the locale changes, and only then
  return <span>{t(K.hud.moves, { count })}</span>;
}
<LocaleProvider locale="ar"><SettingsDialog /></LocaleProvider>   // a part of the screen in another locale (a story, a test)
<Text of={text} k={K.legal.accept} tags={{ link: (children) => <a href="/terms">{children}</a> }} />
<Text of={text} message={props.title} />                         // a key and its variables passed down as data
```

## Tests — `fundamentool/i18n/testing`

```ts
import { checkSet } from 'fundamentool/i18n/testing';
test('every locale of the game', () => checkSet({ en, ru, de }));   // keys, variables, plurals, empty texts
```

Sources: research 03 (`LABARATORY/PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/RESEARCH/03_i18n-module.md`), the design
card (`…/AGENT_DRAFT/SPEC/i18n.md`).
