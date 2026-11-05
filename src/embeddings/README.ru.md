# embeddings — тексты на входе, векторы на выходе

[English version](./README.md)

`fundamentool/embeddings` (fundamentool D-098, D-099): эмбеддер превращает тексты в векторы единичной длины, так что
скалярное произведение двух из них — их косинус, по которому ранжирует поиск по смыслу. Асинхронный: модель грузит
файлы и запускает вычисление (или ходит в сеть). Его синхронная половина, математика над векторами, —
`fundamentool/vectors` (lab D-050: модуль на парадигму).

fundamentool не импортирует библиотеку моделей. Вызывающий передаёт `@huggingface/transformers` сам, как
`sqliteAdapter(new Database(file))` получает драйвер; библиотека — зависимость вызывающего, а тест передаёт поддельную.

```ts
import * as transformers from '@huggingface/transformers';     // зависимость вызывающего
import { createEmbedder, transformersModel } from 'fundamentool/embeddings';
import { nearest } from 'fundamentool/vectors';

const model = transformersModel({ library: transformers, id: 'onnx-community/embeddinggemma-300m-ONNX' });
const embedder = createEmbedder({ model });

embedder.info;                                       // => { id: 'local:onnx-community/embeddinggemma-300m-ONNX@q8', dim: 768 }
const vectors = await embedder.embed(docs, { as: 'document' });              // Float32Array на текст, по порядку
const [query] = await embedder.embed(['насколько различаются две строки'], { as: 'query' });
nearest(query, vectors, 3);                          // => [[12, 0.71], [3, 0.64], [40, 0.6]]
```

| Член | Что делает |
|------|------------|
| `createEmbedder({ model, batch? })` | Эмбеддер над моделью: тексты режутся на пачки по `batch` (по умолчанию и не больше — `maxBatch` модели) |
| `embedder.embed(texts, { as, signal? })` | Векторы по порядку, каждый единичной длины; `as` — `'query'` или `'document'`; `[]` → `[]`; пустой текст отклоняется с его номером; вектор не той длины — ошибка с именем модели; `signal` останавливает между пачками |
| `embedder.info` | `{ id, dim }` — храните `id` рядом с каждым вектором: векторы другой модели несравнимы, а сменившийся `id` говорит, что встроить заново |
| `TEmbeddingModel` | Порт: `{ id, dim, maxBatch, embed(texts, role, signal?) }`. Любой объект этой формы — модель, в том числе над удалённым API, который приложение пишет само (D-098: сначала локальные, удалённым — дверь) |
| `transformersModel({ library, id, dtype?, dim?, pooling?, prefixes?, maxBatch? })` | Модель, работающая на этой машине. `library` — пространство имён библиотеки или его загрузчик: `() => import('@huggingface/transformers')` не грузит библиотеку и её среду, пока не встраивается текст. Ничего не грузится до первого `embed`; вызовы во время загрузки ждут её одну; неудавшаяся загрузка повторяется следующим вызовом. `id` — `local:<id>@<dtype>` (`q8` по умолчанию) |
| `KNOWN_MODELS` | Модели, измеренные для лаборатории, с их `dim`, `pooling` и `prefixes`; для другого id задают `dim` и `pooling` |
| `TEmbedRole`, `TDtype`, `TPooling`, `TPrefixes`, `TTransformersLibrary`, `WHERE` | Роль; квантования; `mean` / `cls` / `last_token` (через `pipeline` библиотеки) или `sentence` (собственный выход модели `sentence_embedding`, через `AutoTokenizer` и `AutoModel`); префиксы по ролям; используемая часть библиотеки; префикс сообщений |

Каждая модель просит тексты по-своему, и `KNOWN_MODELS` это хранит: e5 хочет `query: ` / `passage: `, EmbeddingGemma —
`task: search result | query: ` / `title: none | text: `, Qwen3 — инструкцию перед запросом; bge-m3 — ничего. Оценки
каждой модели лежат на своей шкале, поэтому фиксированный порог между моделями ничего не значит — поиски сливаются по
местам (`fuseRanks`), а не по оценкам.
