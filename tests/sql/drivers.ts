import Database from 'better-sqlite3';
import {
  createRequire,
} from 'node:module';
import {
  sqliteAdapter,
  type TSqliteAdapterOptions,
  type TSqliteDatabasePort,
} from '../../src/sql';

// `@types/node` 20 has no `node:sqlite`; Node 22.5+ has the module — loaded untyped, through its port's shape.
const {
  DatabaseSync,
} = createRequire(__filename)('node:sqlite') as {
  DatabaseSync: new (file: string) => TSqliteDatabasePort;
};

/** The two drivers every adapter test runs on: [name, a new in-memory database]. */
export const DRIVERS: [name: string, open: (file?: string) => TSqliteDatabasePort][] = [
  [
    'better-sqlite3',
    (file = ':memory:') => new Database(file) as unknown as TSqliteDatabasePort,
  ],
  [
    'node:sqlite',
    (file = ':memory:') => new DatabaseSync(file),
  ],
];

/** An adapter over a new in-memory database of the driver. */
export const adapterOf = (open: () => TSqliteDatabasePort, options?: TSqliteAdapterOptions) => sqliteAdapter(open(), options);
