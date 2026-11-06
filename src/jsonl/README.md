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

A streaming decoder of JSONL text: `write(chunk)` returns the values of the lines the chunk completed, `end()` those of
the last line — a `LineDecoder` with `JSON.parse`. It takes strings: decode bytes first (`StringDecoder`). For a Node
`Transform` stream of values, see `node.jsonl.TransformFrom` in [`fundamentool/node`](../node/README.md).

```ts
const decoder = new Decoder();
decoder.write('{"a":1}\n{"b"'); // [{ a: 1 }]
decoder.end('2}');              // [{ b: 2 }]
```

---

## Node.js file operations

For reading and writing `.jsonl` files on disk see [`fundamentool/node`](../node/README.md) — it exposes `node.jsonl` with higher-level streaming helpers (`read`, `readLimited`, `readUnopened`, `write`, etc.).
