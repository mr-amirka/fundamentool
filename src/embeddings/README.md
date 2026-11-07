# embeddings — texts in, vectors out

[Русская версия](./README.ru.md)

`fundamentool/embeddings` (fundamentool D-098, D-099): an embedder turns texts into vectors of unit length, so the dot
product of two is their cosine — what a search by meaning ranks by. Async: a model loads files and runs a process (or
calls a network). Its sync half, the math over the vectors, is `fundamentool/vectors` (lab D-050: a module per
paradigm).

## When you need it

- Turn texts into vectors — for a search by meaning, finding duplicates and near ones, grouping — with a model on this
  machine: no network, no API key.
- Embed a query and the documents each the way the model wants (its prefixes per role).
- Thousands of texts at once, in batches, fast; stopped midway by an `AbortSignal`.
- Swap the model — another local one, or a remote API — with no caller changed; know which stored vectors to embed
  again when the model changed.

fundamentool imports no model library. The caller passes `@huggingface/transformers` in, as `sqliteAdapter(new
Database(file))` takes its driver; the library is the caller's dependency, and a test passes a fake one.

```ts
import * as transformers from '@huggingface/transformers';     // the caller's dependency
import { createEmbedder, transformersModel } from 'fundamentool/embeddings';
import { nearest } from 'fundamentool/vectors';

const model = transformersModel({ library: transformers, id: 'onnx-community/embeddinggemma-300m-ONNX' });
const embedder = createEmbedder({ model });

embedder.info;                                       // => { id: 'local:onnx-community/embeddinggemma-300m-ONNX@q8', dim: 768 }
const vectors = await embedder.embed(docs, { as: 'document' });              // Float32Array per text, in order
const [query] = await embedder.embed(['how far apart are two strings'], { as: 'query' });
nearest(query, vectors, 3);                          // => [[12, 0.71], [3, 0.64], [40, 0.6]]
```

| Member | What it does |
|--------|--------------|
| `createEmbedder({ model, batch? })` | The embedder over a model: texts cut into batches of `batch` (default and at most the model's `maxBatch`), shortest first — a model pads a batch to its longest text, so like lengths go together (a third faster on the lab's sections, D-102); the vectors come back in the texts' order |
| `embedder.embed(texts, { as, signal? })` | The vectors, in order, each of unit length; `as` is `'query'` or `'document'`; `[]` → `[]`; an empty text is refused by its index; a vector of the wrong length is an error naming the model; `signal` stops between batches |
| `embedder.info` | `{ id, dim }` — store `id` beside each vector: vectors of another model don't compare, and a changed `id` says which to embed again |
| `TEmbeddingModel` | The port: `{ id, dim, maxBatch, embed(texts, role, signal?) }`. Any object of this shape is a model — one over a remote API an app writes itself (D-098: local first, remote models a door) |
| `transformersModel({ library, id, dtype?, dim?, pooling?, prefixes?, maxBatch? })` | A model run on this machine. `library` is the namespace, or a loader of it — `() => import('@huggingface/transformers')` keeps the library and its runtime unloaded until a text is embedded. Nothing loads until the first `embed`; calls made during the load share it; a failed load is tried again. `id` is `local:<id>@<dtype>` (`q8` by default) |
| `KNOWN_MODELS` | The models measured for the lab, with their `dim`, `pooling` and `prefixes`; another id gives its `dim` and `pooling` |
| `TEmbedRole`, `TDtype`, `TPooling`, `TPrefixes`, `TTransformersLibrary`, `WHERE` | The role; the quantizations; `mean` / `cls` / `last_token` (through the library's `pipeline`) or `sentence` (the model's own `sentence_embedding`, through `AutoTokenizer` and `AutoModel`); the prefixes per role; the part of the library used; the messages' prefix |

A model asks for its texts its own way, and `KNOWN_MODELS` carries it: e5 wants `query: ` / `passage: `, EmbeddingGemma
`task: search result | query: ` / `title: none | text: `, Qwen3 an instruction before a query; bge-m3 wants nothing.
Each model's scores sit on its own scale, so a fixed threshold means nothing across models — merge searches by rank
(`fuseRanks`), not by score.
