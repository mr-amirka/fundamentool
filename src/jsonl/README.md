# jsonl

> [Русская версия](README.ru.md)

Utilities for working with the [JSON Lines](https://jsonlines.org/) format (`.jsonl`) — one JSON value per line.

```ts
import * as jsonl from 'fundamentool/jsonl';
import { parse, stringify, Decoder } from 'fundamentool/jsonl';
```

---

## String serialization

| Function | Description |
|----------|-------------|
| `parse(text)` | Parses a JSONL string into an array of values |
| `stringify(values)` | Serializes an array of values into a JSONL string |

```ts
const text = stringify([{ id: 1 }, { id: 2 }]);
// '{"id":1}\n{"id":2}'

const values = parse('{"id":1}\n{"id":2}');
// [{ id: 1 }, { id: 2 }]
```

---

## Streaming decoding

### `Decoder`

A `Transform` stream that decodes a byte stream of JSONL data into a stream of parsed JavaScript values. Each incoming chunk is split on newline boundaries and parsed with `JSON.parse`.

```ts
import { createReadStream } from 'fs';

const decoder = new Decoder();
createReadStream('data.jsonl')
  .pipe(decoder)
  .on('data', (value) => console.log(value));
```

---

## Node.js file operations

For reading and writing `.jsonl` files on disk see [`fundamentool/node`](../node/README.md) — it exposes `node.jsonl` with higher-level streaming helpers (`read`, `readLimited`, `readUnopened`, `write`, etc.).
