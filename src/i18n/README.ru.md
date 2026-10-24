# i18n — одна локаль на приложение, свой набор сообщений у каждого пакета

[English version](./README.md)

`fundamentool/i18n` (fundamentool D-060 – D-066). У приложения **одна локаль** (`createLocale`); у каждого пакета —
набора компонентов, игры — **свой набор сообщений** (`createMessages`) со своими файлами. Сообщение читается **по
ключу** — `t(K.hud.moves, { count })`, — и ключ всегда **константа** своего набора, а не голая строка (D-066).

```
<папка набора>/en.ts, ru.ts, de.ts …   базовая локаль (`as const`) и переводы — TypeScript
   ↓ сборка: lexicons() (fundamentool/i18n/vite) — или в памяти: sourceOf()
virtual:lexicons                       ключи один раз + значения каждой локали по позиции; часть локалей — в бандле
   ↓
createLocale → createMessages          текущая локаль (Observable), переключение; t / parts / list … набора
   ↓
fundamentool/view: localeViewProvider  useT, useLocale, LocaleProvider, <Text>
```

## Сообщения

```ts
// src/i18n/en.ts — база: её ключи и имена её переменных — это типы
import type { TMessages } from 'fundamentool/i18n';
export const en = {
  menu: { play: 'Play' },
  hud: { moves: '{{count|one:# move|other:# moves}}' },          // множественное число; # — число, отформатированное
  level: { title: 'Level {{id}} ({{id|number}} of {{total}})' },  // одно значение и как текст, и как число
  shop: { price: 'Only {{price|currency:USD}}' },
  chat: { sent: 'Sent {{at|clock}}' },                            // |date[:short…] |clock |relative |list |percent
  tip: { hint: 'Tap <b>{{booster|t}}</b> to see the next step' }, // тег; |t — значение — ключ набора
  booster: { hint: { name: 'Hint' } },
  praise: ['Excellent!', 'Wonderful!'],                          // список — у каждого языка своя длина
} as const satisfies TMessages;

// src/i18n/ru.ts — перевод: то же дерево (пропущенный ключ — ошибка компиляции)
import type { TTranslation } from 'fundamentool/i18n';
import type { en } from './en';
export const messages: TTranslation<typeof en> = { /* … */ };
```

Файл сообщений — только данные: он может импортировать типы, но не значения.

## Сборка — `fundamentool/i18n/vite`

```ts
// vite.config.ts
import { lexicons } from 'fundamentool/i18n/vite';
plugins: [lexicons({
  locales: LOCALES,                                            // первая — базовая
  sets: {
    kit: { from: '@wg/components/i18n', override: './src/i18n/kit' },   // приложение переформулирует часть текстов набора
    game: { from: './src/i18n' },
  },
  inline: 'all',                                               // или ['en', 'ru'] — остальные по запросу; по умолчанию — база
})]
```

`virtual:lexicons` хранит дерево ключей один раз (`[["menu", ["play"]], ["booster", [["hint", ["name"]]]]]`) и
значения встроенных локалей в его порядке (`["Play", "Hint"]`); каждая другая локаль — свой маленький чанк. У обоих —
хэш ключей: чанк от другой сборки отвергается. **Перевод, не совпадающий с базой, валит сборку** — пропущенный или
лишний ключ, другие переменные, множественное число без `other`. Нужен Node 24+ (TypeScript-файлы читаются его
встроенным удалением типов).

Один раз объявить модуль для TypeScript в приложении:
```ts
declare module 'virtual:lexicons' {
  const source: import('fundamentool/i18n').TLexiconSource;
  export default source;
}
```

## Во время работы

```ts
import source from 'virtual:lexicons';
import { createLocale, createMessages } from 'fundamentool/i18n';
import type { en } from './i18n/en';                         // тип — тексты приходят из source, а не второй раз

export const locale = createLocale({ source, locales: LOCALES });
export const text = createMessages<typeof en>(locale, 'game');
export const K = text.keys;                                   // единственное место ключей (D-066)

await locale.select(locale.detect([settings.language, ...navigator.languages])); // побеждает последний select
locale.$locale.getState();                 // 'de' — всегда локаль, чьи тексты уже есть
await locale.ready();                      // экран загрузки ждёт язык игрока

text.t(K.hud.moves, { count: 3 });         // '3 moves'; ru — '3 хода'
text.t(K.hud.moves, { count: '3' });       // то же: значения приводятся там, где это нужно сообщению (D-062)
text.t('hud.moves', { count: 3 });         // ❌ ошибка компиляции: голая строка — не ключ
text.t(K.hud.moves);                       // ❌ ошибка компиляции: не передан `count`
text.translate('ru', K.menu.play);         // другая локаль ('Играть') — бот отвечает в два чата
text.parts(K.tip.hint, { booster: K.booster.hint.name }); // [{ text: 'Tap ' }, { text: 'Hint', tag: 'b' }, …]
text.list(K.praise);                       // ['Excellent!', 'Wonderful!']
text.has(serverKey);                       // ключ с сервера → типизированный ключ
text.format.number(12345);                 // '12,345' — .currency, .percent, .date, .clock, .relative, .list
locale.pick({ en: 'Forest', ru: 'Лес' });  // контент со своими переводами
```

**Значение, которое нельзя показать** (`{ count: 'many' }`, не переданная переменная, неизвестный ключ): в разработке —
ошибка, называющая сообщение, переменную, что ожидалось и что пришло; в продакшене — значение как есть и одно
предупреждение. Для текста, которого нет в переводе, показывается базовый (в разработке — одно предупреждение на
локаль).

`createI18n({ source, locales })` — `createLocale` + единственный набор, для приложения с одним набором текстов.
`sourceOf({ game: { en, ru } }, 'en')` — тот же source в памяти: тесты, Node, приложение, собранное без Vite.

## React — `fundamentool/view`

```tsx
const { useT, useLocale, LocaleProvider, Text } = localeViewProvider(React);

function Moves({ count }: { count: number }) {
  const t = useT(text);                                       // перерисовывается при смене локали — и только тогда
  return <span>{t(K.hud.moves, { count })}</span>;
}
<LocaleProvider locale="ar"><SettingsDialog /></LocaleProvider>   // часть экрана на другом языке (история, тест)
<Text of={text} k={K.legal.accept} tags={{ link: (children) => <a href="/terms">{children}</a> }} />
<Text of={text} message={props.title} />                         // ключ и его переменные, переданные данными
```

## Тесты — `fundamentool/i18n/testing`

```ts
import { checkSet } from 'fundamentool/i18n/testing';
test('every locale of the game', () => checkSet({ en, ru, de }));   // ключи, переменные, множественное число, пустые тексты
```

Источники: исследование 03 (`LABARATORY/PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/RESEARCH/03_i18n-module.md`),
карточка дизайна (`…/AGENT_DRAFT/SPEC/i18n.md`).
