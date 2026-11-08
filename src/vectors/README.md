# vectors — the math over embeddings

[Русская версия](./README.ru.md)

`fundamentool/vectors` (fundamentool D-099): what a search by meaning does with the vectors an embedder gives — pure,
sync, for hot loops over thousands of them. Its async half, the embedder itself, is `fundamentool/embeddings`
(lab D-050: a module per paradigm).

## When you need it

- Find the stored texts closest in meaning to a query — "similar to this", a search by meaning — among thousands of
  vectors, filtered by kind before scoring.
- Merge the results of several searches into one list — a hybrid search, keywords and vectors; two indexes — when their
  scores don't compare: reciprocal rank fusion (RRF).
- Keep vectors in a database (an SQLite BLOB column) and read them back.
- Cut a long text into pieces a model can read — whole sentences, with an overlap — before embedding it.
- Cut a structured text — a Markdown document, a chat reply with code and lists — by its blocks, so a code block, a
  list item or a table is not split and a piece from the middle of a section says which section it is in.
- The cosine similarity of two vectors.

```ts
import { nearest, fuseRanks, toBytes, fromBytes, chunkText, chunkBlocks } from 'fundamentool/vectors';

nearest(query, vectors, 3);                         // => [[412, 0.86], [97, 0.84], [5, 0.84]] — [index, score], best first
nearest(query, vectors, 3, { where: (i) => nodes[i].type === 'function' });  // asked before scoring
fuseRanks([wordHits, meaningHits]);                 // => [['editDistance', 0.0325], ['spaces', 0.0164], …] — merged by rank
db.run('INSERT INTO vectors VALUES (?, ?)', [rid, toBytes(vector)]);         // a BLOB column, and back: fromBytes
chunkText(longSection, { maxWords: 200, overlap: 20 });                      // whole sentences where they fit
chunkBlocks(readBlocks(reply), { maxWords: 200, overlap: 20 });              // whole blocks — readBlocks: markdown-tree
```

| Member | What it does |
|--------|--------------|
| `dot(a, b)` | The dot product — the cosine of two unit vectors, as an embedder gives them; a length mismatch is refused in development |
| `nearest(query, vectors, k, { where? })` | The `k` closest, best first, as `[index, score]` tuples; equal scores keep the lower index first; `where(index)` filters before scoring |
| `fuseRanks(lists, { k? })` | Rankings merged by reciprocal rank fusion: rank `r` (from 1) adds `1 / (k + r)`, `k` 60 by default; `[id, score]` tuples, best first, so merged lists of a caller's own compare. Scores of different searches don't compare (a BM25 is unbounded, a cosine at most 1); ranks do |
| `toBytes(vector)`, `fromBytes(bytes)` | 32-bit floats, little-endian on every platform; a Node `Buffer` is read at its own offset |
| `chunkText(text, { maxWords?, overlap? })` | Pieces of at most `maxWords` words (200): whole sentences while they fit, the last sentence repeated when within `overlap` (20), a longer sentence cut into windows sharing `overlap` words; `''` → `[]` |
| `chunkBlocks(blocks, { maxWords?, overlap? })` | A text's blocks (`TTextBlock`: `{ text, context?, keepWithNext? }`, from a reader) in pieces of at most `maxWords` words: whole blocks while they fit, joined by a blank line; a piece opening inside a section starts with its `context` (within `overlap` words); a `keepWithNext` block (a heading) goes with the next; the block before a cut repeated when within `overlap`; a block too long cut by `chunkText`. It knows blocks, not Markdown |
| `wordsOf(text)` | A text's words as the two count them — the runs between spaces: whether a text fits in one piece |
| `TVector`, `TNearestHit`, `TFusedHit`, `WHERE` | `ArrayLike<number>`; `[index, score]`; `[id, score]`; the messages' prefix |

`nearest` scans every vector — 20,000 vectors of 384 numbers is a few milliseconds. An index for millions (HNSW,
`sqlite-vec`) answers the same question in its own store when it is needed.
