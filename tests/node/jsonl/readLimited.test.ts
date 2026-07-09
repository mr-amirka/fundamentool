import {
  tmpdir, 
} from 'os';
import {
  join, 
} from 'path';
import {
  mkdirSync, writeFileSync, rmSync, 
} from 'fs';
import {
  readLimited, 
} from '../../../src/node/jsonl/readLimited';
import {
  readUnopened, 
} from '../../../src/node/jsonl/readUnopened';
import {
  readUnopenedLimited, 
} from '../../../src/node/jsonl/readUnopenedLimited';

function tmpDir() {
  const dir = join(tmpdir(), `fundamentool-jlimit-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, {
    recursive: true, 
  });
  return dir;
}

function writeJsonl(path: string, records: any[]) {
  writeFileSync(path, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// ── readLimited ────────────────────────────────────────────────────────────────

describe('node/jsonl/readLimited', () => {
  test('next() returns up to limit records per call', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeJsonl(path, [
      {
        n: 1, 
      },
      {
        n: 2, 
      },
      {
        n: 3, 
      },
      {
        n: 4, 
      },
      {
        n: 5, 
      },
    ]);

    const next = readLimited(path, {
      limit: 2, 
    });
    const batch1 = await next();
    expect(batch1.length).toBeLessThanOrEqual(2);
    next.close();
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('returns empty array when stream is exhausted', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeJsonl(path, [{
      n: 1, 
    }]);

    const next = readLimited(path, {
      limit: 10, 
    });
    await next(); // consume all
    const done = await next();
    expect(done).toEqual([]);
    next.close();
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('collects all records across multiple next() calls', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeJsonl(path, [
      {
        n: 1, 
      },
      {
        n: 2, 
      },
      {
        n: 3, 
      },
    ]);

    const next = readLimited(path, {
      limit: 2, 
    });
    const all: any[] = [];
    let batch: any[];
    while ((batch = await next()).length > 0) {
      all.push(...batch);
    }
    expect(all).toEqual([
      {
        n: 1, 
      },
      {
        n: 2, 
      },
      {
        n: 3, 
      },
    ]);
    next.close();
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('default limit is 100', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeJsonl(path, Array.from({
      length: 50, 
    }, (_, i) => ({
      i, 
    })));

    const next = readLimited(path);
    const batch = await next();
    expect(batch.length).toBe(50);
    next.close();
    rmSync(dir, {
      recursive: true, 
    });
  });
});

// ── readUnopened ───────────────────────────────────────────────────────────────

describe('node/jsonl/readUnopened', () => {
  test('reads existing JSONL file', (done) => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeJsonl(path, [{
      a: 1, 
    }, {
      a: 2, 
    }]);

    const items: any[] = [];
    const stream = readUnopened(path);
    stream.on('data', (obj) => items.push(obj));
    stream.on('end', () => {
      expect(items).toEqual([{
        a: 1, 
      }, {
        a: 2, 
      }]);
      rmSync(dir, {
        recursive: true, 
      });
      done();
    });
    stream.on('error', done);
  });
});

// ── readUnopenedLimited ────────────────────────────────────────────────────────

describe('node/jsonl/readUnopenedLimited', () => {
  test('limits records from readUnopened stream', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeJsonl(path, [
      {
        n: 1, 
      },
      {
        n: 2, 
      },
      {
        n: 3, 
      },
      {
        n: 4, 
      },
    ]);

    const next = readUnopenedLimited(path, {
      limit: 2, 
    });
    const batch = await next();
    expect(batch.length).toBeLessThanOrEqual(2);
    next.close();
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('collects all records across batches', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeJsonl(path, [
      {
        n: 1, 
      },
      {
        n: 2, 
      },
      {
        n: 3, 
      },
    ]);

    const next = readUnopenedLimited(path, {
      limit: 2, 
    });
    const all: any[] = [];
    let batch: any[];
    while ((batch = await next()).length > 0) {
      all.push(...batch);
    }
    expect(all).toEqual([
      {
        n: 1, 
      },
      {
        n: 2, 
      },
      {
        n: 3, 
      },
    ]);
    next.close();
    rmSync(dir, {
      recursive: true, 
    });
  });
});
