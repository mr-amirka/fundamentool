# jsonl

> [English version](README.md)

Утилиты для работы с форматом [JSON Lines](https://jsonlines.org/) (`.jsonl`) — одно JSON-значение на строку.

```ts
import * as jsonl from 'fundamentool/jsonl';
import { parse, stringify, Decoder } from 'fundamentool/jsonl';
```

---

## Строковая сериализация

| Функция | Описание |
|---------|----------|
| `parse(text)` | Разбирает JSONL-строку в массив значений |
| `stringify(values)` | Сериализует массив значений в JSONL-строку |

```ts
const text = stringify([{ id: 1 }, { id: 2 }]);
// '{"id":1}\n{"id":2}'

const values = parse('{"id":1}\n{"id":2}');
// [{ id: 1 }, { id: 2 }]
```

---

## Потоковое декодирование

### `Decoder`

Transform-поток, который декодирует байтовый поток JSONL-данных в поток распарсенных JavaScript-значений. Каждый входящий чанк разбивается по символу новой строки и разбирается через `JSON.parse`.

```ts
import { createReadStream } from 'fs';

const decoder = new Decoder();
createReadStream('data.jsonl')
  .pipe(decoder)
  .on('data', (value) => console.log(value));
```

---

## Файловые операции в Node.js

Для чтения и записи `.jsonl`-файлов на диск смотри [`fundamentool/node`](../node/README.ru.md) — там доступен `node.jsonl` с высокоуровневыми стриминг-хелперами (`read`, `readLimited`, `readUnopened`, `write` и др.).
