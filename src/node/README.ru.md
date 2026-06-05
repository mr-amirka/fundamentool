# node

> [English version](README.md)

Node.js-специфичные утилиты для файлового I/O, хеширования, сканирования директорий и HTTP-запросов.

```ts
import * as node from 'fundamentool/node';
import { scanPath, searchFiles } from 'fundamentool/node';
```

---

## `node.file` — файловые операции

### CSV

```ts
import { file } from 'fundamentool/node';

await file.csv.write('./data', [['name', 'age'], ['Alice', '30']]);
// создаёт ./data.csv

const rows = await file.csv.read('./data');
// [['name', 'age'], ['Alice', '30']]

// Атомарный снапшот (записывает основной файл + .recov-копию)
await file.csv.snapshot.write('./state', rows);
const saved = await file.csv.snapshot.read('./state', () => []);
```

### JSON

```ts
await file.json.write('./config', { version: 1 });
const config = await file.json.read('./config');
```

---

## `node.jsonl` — потоковый JSONL

```ts
import { jsonl } from 'fundamentool/node';

// Запись
const out = jsonl.write('./events');
out.push({ type: 'start' });
out.push({ type: 'end' });
await out.end();

// Чтение всех записей сразу
const events = await jsonl.promisify.read('./events');

// Чтение пакетами по N записей
const stream = jsonl.readLimited('./events', 100);
const batch = await stream.next(); // до 100 элементов

// Tail-режим: читает строки, дописанные в файл после открытия
const live = jsonl.readUnopened('./live.jsonl');
```

---

## `node.hash` — криптографическое хеширование

```ts
import { hash } from 'fundamentool/node';

hash('hello world');             // hex-строка sha256
hash('hello world', 'md5');      // hex-строка md5
hash(Buffer.from([1, 2, 3]));    // хеш бинарных данных
```

---

## `scanPath` — сканирование дерева директорий

Рекурсивно обходит директорию и вызывает callback для каждого найденного файла.

```ts
import { scanPath } from 'fundamentool/node';

await scanPath('./src', (filePath) => {
  console.log(filePath);
}, (name) => name === 'node_modules'); // предикат исключения
```

---

## `searchFiles` — сбор путей к файлам

```ts
import { searchFiles } from 'fundamentool/node';

const paths = await searchFiles.searchFilesIndex('./src');
// ['/abs/path/file1.ts', '/abs/path/file2.ts', ...]
```

---

## `node.request` — HTTP

Низкоуровневые HTTP-хелперы для выполнения запросов из Node.js-скриптов.

```ts
import { request } from 'fundamentool/node';
```
