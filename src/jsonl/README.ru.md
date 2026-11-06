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

Потоковый декодер JSONL-текста: `write(chunk)` возвращает значения строк, которые этот кусок дописал, `end()` — значение
последней строки; это `LineDecoder` с `JSON.parse`. Он принимает строки: байты сначала декодируйте (`StringDecoder`).
Node-поток `Transform` значений — `node.jsonl.TransformFrom` в [`fundamentool/node`](../node/README.md).

```ts
const decoder = new Decoder();
decoder.write('{"a":1}\n{"b"'); // [{ a: 1 }]
decoder.end('2}');              // [{ b: 2 }]
```

---

## Файловые операции в Node.js

Для чтения и записи `.jsonl`-файлов на диск смотри [`fundamentool/node`](../node/README.ru.md) — там доступен `node.jsonl` с высокоуровневыми стриминг-хелперами (`read`, `readLimited`, `readUnopened`, `write` и др.).
