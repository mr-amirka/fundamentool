import {
  DRIVERS,
} from './drivers';

type TProcess = {
  getBuiltinModule?: (id: string) => unknown;
};

/** The adapter's module loaded afresh while `process.getBuiltinModule` is `replacement`. */
const loadWith = (replacement: TProcess['getBuiltinModule']): typeof import('../../src/sql/adapter') => {
  const host = process as TProcess;
  const original = host.getBuiltinModule;
  host.getBuiltinModule = replacement;
  try {
    let loaded!: typeof import('../../src/sql/adapter');
    jest.isolateModules(() => {
      loaded = require('../../src/sql/adapter');
    });
    return loaded;
  } finally {
    host.getBuiltinModule = original;
  }
};

describe('sqliteAdapter where AsyncLocalStorage can\'t be reached', () => {
  test.each<[string, TProcess['getBuiltinModule']]>([
    [
      'no process.getBuiltinModule (Node before 22.3, a browser)',
      undefined,
    ],
    [
      'node:async_hooks without AsyncLocalStorage',
      () => ({}),
    ],
  ])('%s: transactions work; an outer session inside one isn\'t caught', async (_name, replacement) => {
    const {
      sqliteAdapter,
    } = loadWith(replacement);
    const db = sqliteAdapter(DRIVERS[0][1]());
    await db.exec('CREATE TABLE t (id INTEGER)');
    await expect(db.transaction(async (tx) => {
      await tx.exec('INSERT INTO t VALUES (1)');
      return 'done';
    })).resolves.toBe('done');
    let reached = false;
    const stuck = db.transaction(async () => {
      await db.exec('INSERT INTO t VALUES (2)');
      reached = true;
    });
    const settled = await Promise.race([
      stuck.then(() => 'settled'),
      new Promise((resolve) => {
        setTimeout(() => resolve('still waiting'), 20);
      }),
    ]);
    expect(settled).toBe('still waiting');
    expect(reached).toBe(false);
  });
});
