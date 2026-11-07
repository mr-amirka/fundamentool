# source — строки из исходного кода

[English version](./README.md)

`fundamentool/source` (fundamentool D-097) читает статические строки из кода, не запуская его: классы компонента,
идентификаторы тестов, пути маршрутов, ключи `t('…')`. А ещё заменяет комментарии пробелами, делит однофайловый
компонент на части и применяет правки по позициям.

## Когда нужен

- Найти строки в исходном коде, не запуская его, — имена классов, test id, пути маршрутов, ключи `t('…')` — чтобы
  собрать CSS-классы проекта или проверить ключи переводов.
- Строки, которыми может быть выражение: обе ветки тернарника, правая часть `&&`, обе стороны `||` и `??`.
- Читать код без комментариев, с сохранёнными позициями (комментарии заменены пробелами).
- Разделить файл `.vue`, `.svelte` или `.astro` на разметку и скрипты.
- Переписать исходник по позициям — несколько правок разом (кодмод, автоисправление).

Ядро знает языки и то, как их читать. **Во что превращается строка — решает вызывающий**: каждый читатель пишет в
список вызывающего через его `push`. `push` minotation делит список классов на токены; другой вызывающий кладёт строку
целиком.

```ts
import {
  blankComments, expressionStrings, sourceStringsProvider, sfcParts, blankSpan, applyEdits,
  parseSource, syntaxStringsProvider, syntaxValueRanges,
} from 'fundamentool/source';

const out: string[] = [];
const push = (list: string[], text: string) => {
  list.push(text);
};

// Строки, которыми может стать выражение: обе ветки, правая часть &&, обе части || и ??.
expressionStrings("v === 'splash' ? 'bg1 cF' : 'fx1' }", 0, out, push);   // out: ['bg1 cF', 'fx1']

// Строки в местах по имени, `*Окончание` — шаблон. Создаётся один раз (проверка в разработке), зовётся на файл.
const strings = sourceStringsProvider({
  attrs: ['class', 'className', '*ClassName'],   // class="…", className={…}, { className: '…' }
  variables: ['*Class'],                         // const rowClass = '…', { rowClass: '…' }
  calls: ['mne', '*Class'],                      // mne(base, 'p10'), thClass('w150')
});
strings(blankComments(source), out, push);       // сначала комментарии, если они не должны считаться

// То же парсером TypeScript, которого даёт вызывающий: fundamentool не импортирует `typescript`.
import ts from 'typescript';
const file = parseSource(ts, source, 'App.tsx');   // undefined — синтаксическая ошибка; тогда читать текстом
const syntaxStrings = syntaxStringsProvider(ts, { attrs: ['className'], calls: ['mne'] });
file && syntaxStrings(file, out, push);
syntaxValueRanges(ts, file, ['className']);        // [from, to) каждого значения — для писателя

// Однофайловый компонент: 0 — разметка, 1 — скрипт TS, 2 — скрипт TSX, по порядку и без пропусков.
sfcParts('<template><b/></template><script lang="ts">let a</script>');
// [[0, 0, 43], [1, 43, 48], [0, 48, 57]]

// Правки по позициям исходника; пересекающиеся — ошибка в разработке.
applyEdits('<b class="p">', [[10, 10, '_l ']]);   // '<b class="_l p">'
```

| Член | Что делает |
|------|------------|
| `blankComments(source, out?, onComment?)` | `//`, `/* */`, `<!-- -->` — пробелами, длина и строки сохраняются; строки пропускаются целиком; `onComment(out, source, from, to)` сначала читает каждый комментарий |
| `blankSpan(source, from, to)` | диапазон пробелами, переводы строк сохраняются |
| `expressionStrings(source, at, out, push)` | строки, которыми может стать выражение; → позиция за ним |
| `sourceStringsProvider(places)` | читатель `(source, out, push)` строк в `attrs`, `variables`, `calls` |
| `parseSource(ts, source, fileName?)` | дерево или `undefined` при синтаксической ошибке; `.ts`/`.mts`/`.cts` без JSX, остальное — как TSX |
| `syntaxStringsProvider(ts, places)` | двойник `sourceStringsProvider` на парсере: читатель `(file, out, push)` |
| `syntaxValueRanges(ts, file, names)` | диапазоны значений атрибутов и ключей объектов |
| `sfcParts(source)` | части файла `.vue`, `.svelte`, `.astro` |
| `applyEdits(source, edits)` | правки `[from, to, text]` одним проходом |
| `matchesName(name, patterns)`, `namePatternSource(pattern)` | шаблоны имён — для собственного поиска вызывающего |

- **Что даёт выражение.** `cond ? 'a' : 'b'` — обе ветки; `x && 'a'` — `'a'`; `a || 'b'`, `a ?? 'b'` — обе части;
  шаблон — свои статические куски и то, чем может стать `${…}`. Не условие: в `v === 'splash' ? …` строка `'splash'` —
  операнд сравнения, и читатель отрезает её из `out`. Вызов, свойство, склейка ничего не дают: их значение известно
  только при выполнении. Текстовый читатель и парсер сверены на одной таблице случаев.
- **Строки как написаны.** Текстовый читатель кладёт строку как она стоит между кавычками (`'a\'b'` → `a\'b`);
  парсер — её значение (`a'b`).
- **Читатель текста.** `blankComments` и `sourceStringsProvider` не разбирают язык: литерал регулярного выражения
  (`/"/`) или шаблон внутри `${…}` могут их сбить. Где файл — JS или TS, у парсера таких случаев нет.
- **Скорость.** Состояние на уровне модуля и кортежи; провайдер строит регулярки и списки один раз; обход парсера не
  создаёт функцию на узел.
