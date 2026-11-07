# tupleLog — records as tuples, a format with versions

[Русская версия](./README.ru.md)

A log of records written one a line as JSON arrays — the type first, the fields in their places — with the field names
kept once, in a schema (fundamentool D-108). The format has versions: a `["~", n]` line says the version of the lines
after it, and each version moves the records of the one before to itself, so a file is only ever appended and every
line is read as the newest version.

## When you need it

- A log that only grows and is kept for good — a chat, an audit trail, events — where an object's repeated field names
  would be most of its size.
- A format that will change while old files stay as they are: add a field, rename one, drop a type — the old lines
  read through the new version, nothing rewritten.
- A schema a reader in another language can follow: `schema()` is the file to put beside the logs.
- Lines that may be broken or of another tool: each is a problem with its line number, the rest read.

```ts
import { tupleLog } from 'fundamentool';

const chat = tupleLog({
  name: 'chat',
  versions: [
    { types: { m: ['at', 'text'] } },                                    // version 1
    { types: { m: ['at', 'from', 'text'] }, up: (r) => ({ ...r, from: 'owner' }) }, // version 2: a field added
  ],
});

chat.head();                                            // '["~",2]' — a file's first line, or appended when the format moved on
chat.line({ type: 'm', at: '2026-11-07T10:00:00Z', from: 'agent', text: 'done' });
// '["m","2026-11-07T10:00:00Z","agent","done"]'

chat.read('["~",1]\n["m","t1","hi"]\n["~",2]\n["m","t2","agent","done"]');
// { records: [{ type: 'm', at: 't1', from: 'owner', text: 'hi', line: 2 },
//             { type: 'm', at: 't2', from: 'agent', text: 'done', line: 4 }], problems: [], dropped: 0 }

chat.schema();  // { format: 'tuple-log', name: 'chat', version: 2, versions: [{ m: ['at', 'text'] }, { m: ['at', 'from', 'text'] }] }
```

| Member | What it does |
|--------|--------------|
| `tupleLog({ name, versions })` | The format; the last version is written. Options checked in development: an unknown key ("did you mean"), no versions, a type's fields not names, the type `~` |
| `log.head()` | `["~", version]` — the version line |
| `log.line(record)` | The record as a line of the newest version, no newline. A type the version doesn't name, or a field left `undefined`, throws — `null` is a value, a missing field never silently becomes one |
| `log.read(text)` | `{ records, problems, dropped }`: each record moved to the newest version, with its line; lines before any `~` line are version 1; a broken line, an unknown type or a wrong length is a problem, the rest kept |
| `log.schema()` | `{ format: 'tuple-log', name, version, versions }` — every version's types, for the schema's file |
| `log.version`, `log.name` | The newest version; the format's name |

A version's `up(record)` gets the record as the version before named it and returns it as this version names it, or
`null` to leave it out (`dropped`). Without `up`, the fields this version names are kept by name, a new one `null`, and
a type it no longer names is left out. A line of version 1 read by a format at version 3 goes through version 2's step,
then version 3's.
