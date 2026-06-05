# node

> [Русская версия](README.ru.md)

Node.js-specific utilities for file I/O, hashing, directory scanning, and HTTP requests.

```ts
import * as node from 'fundamentool/node';
import { scanPath, searchFiles } from 'fundamentool/node';
```

---

## `node.file` — file I/O

### CSV

```ts
import { file } from 'fundamentool/node';

await file.csv.write('./data', [['name', 'age'], ['Alice', '30']]);
// writes ./data.csv

const rows = await file.csv.read('./data');
// [['name', 'age'], ['Alice', '30']]

// Atomic snapshot (writes main + .recov copy)
await file.csv.snapshot.write('./state', rows);
const saved = await file.csv.snapshot.read('./state', () => []);
```

### JSON

```ts
await file.json.write('./config', { version: 1 });
const config = await file.json.read('./config');
```

---

## `node.jsonl` — streaming JSONL file I/O

```ts
import { jsonl } from 'fundamentool/node';

// Write
const out = jsonl.write('./events');
out.push({ type: 'start' });
out.push({ type: 'end' });
await out.end();

// Read all at once
const events = await jsonl.promisify.read('./events');

// Read up to N items per batch
const stream = jsonl.readLimited('./events', 100);
const batch = await stream.next(); // up to 100 items

// Tail-like: read lines appended after open (polling)
const live = jsonl.readUnopened('./live.jsonl');
```

---

## `node.hash` — crypto hashing

```ts
import { hash } from 'fundamentool/node';

hash('hello world');             // sha256 hex string
hash('hello world', 'md5');      // md5 hex string
hash(Buffer.from([1, 2, 3]));    // hash of binary data
```

---

## `scanPath` — directory tree scan

Recursively scans a directory and calls a callback for every file found.

```ts
import { scanPath } from 'fundamentool/node';

await scanPath('./src', (filePath) => {
  console.log(filePath);
}, (name) => name === 'node_modules'); // exclude predicate
```

---

## `searchFiles` — collect file paths

```ts
import { searchFiles } from 'fundamentool/node';

const paths = await searchFiles.searchFilesIndex('./src');
// ['/abs/path/file1.ts', '/abs/path/file2.ts', ...]
```

---

## `node.request` — HTTP

Low-level HTTP helpers for making requests from Node.js scripts.

```ts
import { request } from 'fundamentool/node';
```
