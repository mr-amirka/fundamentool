import {
  tmpdir,
} from 'os';
import {
  join,
} from 'path';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'fs';
import {
  finished,
} from 'stream/promises';
import {
  TransformFrom,
} from '../../../src/node/jsonl/TransformFrom';
import {
  TransformTo,
} from '../../../src/node/jsonl/TransformTo';
import {
  read,
} from '../../../src/node/jsonl/read';
import {
  write,
} from '../../../src/node/jsonl/write';
import * as promisify from '../../../src/node/jsonl/promisify';

function tmpDir() {
  const dir = join(tmpdir(), `fundamentool-jsonl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, {
    recursive: true,
  });
  return dir;
}

function collectStream(stream: NodeJS.ReadableStream): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const items: any[] = [];
    stream.on('data', (chunk) => items.push(chunk));
    stream.on('end', () => resolve(items));
    stream.on('error', reject);
  });
}

describe('node/jsonl — TransformTo (serialize)', () => {
  test('emits JSONL lines for written objects', (done) => {
    const transform = new (TransformTo as any)();
    const chunks: string[] = [];
    transform.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
    transform.on('end', () => {
      const joined = chunks.join('');
      expect(joined).toBe('{"a":1}\n{"b":2}\n');
      done();
    });
    transform.write({
      a: 1,
    });
    transform.write({
      b: 2,
    });
    transform.end();
  });
});

describe('node/jsonl — TransformFrom (deserialize)', () => {
  test('parses JSONL lines into objects', (done) => {
    const transform = new (TransformFrom as any)();
    const items: any[] = [];
    transform.on('data', (obj: any) => items.push(obj));
    transform.on('end', () => {
      expect(items).toEqual([
        {
          a: 1,
        },
        {
          b: 2,
        },
      ]);
      done();
    });
    transform.write(Buffer.from('{"a":1}\n{"b":2}\n'));
    transform.end();
  });

  test('handles split chunks across line boundaries', (done) => {
    const transform = new (TransformFrom as any)();
    const items: any[] = [];
    transform.on('data', (obj: any) => items.push(obj));
    transform.on('end', () => {
      expect(items).toEqual([
        {
          x: 42,
        },
      ]);
      done();
    });
    transform.write(Buffer.from('{"x"'));
    transform.write(Buffer.from(':42}\n'));
    transform.end();
  });
});

describe('node/jsonl — round-trip via pipe', () => {
  test('TransformTo → TransformFrom produces original objects', (done) => {
    const toStream = new (TransformTo as any)();
    const fromStream = new (TransformFrom as any)();
    const items: any[] = [];

    fromStream.on('data', (obj: any) => items.push(obj));
    fromStream.on('end', () => {
      expect(items).toEqual([
        {
          id: 1,
        },
        {
          id: 2,
        },
        {
          id: 3,
        },
      ]);
      done();
    });

    toStream.pipe(fromStream);
    toStream.write({
      id: 1,
    });
    toStream.write({
      id: 2,
    });
    toStream.write({
      id: 3,
    });
    toStream.end();
  });
});

describe('node/jsonl — file read (from pre-written file)', () => {
  test('read() parses a JSONL file', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeFileSync(path, '{"a":1}\n{"b":2}\n{"c":3}\n');

    const items = await collectStream(read(path));
    expect(items).toEqual([
      {
        a: 1,
      },
      {
        b: 2,
      },
      {
        c: 3,
      },
    ]);
    rmSync(dir, {
      recursive: true,
    });
  });

  test('read() handles empty file', async () => {
    const dir = tmpDir();
    const path = join(dir, 'empty.jsonl');
    writeFileSync(path, '');

    const items = await collectStream(read(path));
    expect(items).toEqual([]);
    rmSync(dir, {
      recursive: true,
    });
  });
});

describe('node/jsonl — file write', () => {
  test('write() produces valid JSONL content in file', async () => {
    const dir = tmpDir();
    const path = join(dir, 'out.jsonl');
    const records = [
      {
        a: 1,
      },
      {
        b: 'hello',
      },
    ];

    const out = write(path) as any;
    out.on('error', (e: any) => {
      throw e;
    });
    records.forEach((r) => out.write(r));
    out.end();
    await finished(out); // the stream finishes when the file is written

    const items = await collectStream(read(path));
    expect(items).toEqual(records);
    rmSync(dir, {
      recursive: true,
    });
  });

  test('write() creates parent directories', async () => {
    const dir = tmpDir();
    const path = join(
      dir, 'nested', 'out.jsonl',
    );

    const out = write(path) as any;
    out.on('error', (e: any) => {
      throw e;
    });
    out.write({
      v: 1,
    });
    out.end();
    await finished(out);

    const items = await collectStream(read(path));
    expect(items).toEqual([
      {
        v: 1,
      },
    ]);
    rmSync(dir, {
      recursive: true,
    });
  });
});

describe('node/jsonl/promisify — read', () => {
  test('resolves with array of parsed records', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data.jsonl');
    writeFileSync(path, '{"n":10}\n{"n":20}\n{"n":30}\n');

    const records = await promisify.read(path);
    expect(records).toEqual([
      {
        n: 10,
      },
      {
        n: 20,
      },
      {
        n: 30,
      },
    ]);
    rmSync(dir, {
      recursive: true,
    });
  });

  test('with onReadable it is told when records are ready — and still resolves with them all', async () => {
    const dir = tmpDir();
    const path = join(dir, 'told.jsonl');
    writeFileSync(path, '{"n":1}\n{"n":2}\n');
    const told = jest.fn();
    await expect(promisify.read(
      path, undefined, told,
    )).resolves.toEqual([
      {
        n: 1,
      },
      {
        n: 2,
      },
    ]);
    expect(told).toHaveBeenCalled();
    rmSync(dir, {
      recursive: true,
    });
  });

  test('resolves with empty array for empty file', async () => {
    const dir = tmpDir();
    const path = join(dir, 'empty.jsonl');
    writeFileSync(path, '');

    const records = await promisify.read(path);
    expect(records).toEqual([]);
    rmSync(dir, {
      recursive: true,
    });
  });
});

describe('node/jsonl write — done means written; the file\'s failures are the stream\'s', () => {
  it('finished() — the file holds every row, its folder made', async () => {
    const dir = tmpDir();
    const path = join(
      dir, 'nested', 'rows.jsonl',
    );
    const out = write(path) as any;
    out.write({
      i: 0,
    });
    out.write({
      i: 1,
    });
    out.end();
    try {
      await finished(out);
      expect(readFileSync(path, 'utf8')).toBe('{"i":0}\n{"i":1}\n');
    } finally {
      rmSync(dir, {
        recursive: true,
      });
    }
  });

  it('a folder where the file goes (EISDIR), a file where the folder goes (EEXIST), a failed flush: the stream errors', async () => {
    const dir = tmpDir();
    const file = join(dir, 'a.jsonl');
    writeFileSync(file, '');
    try {
      const onFolder = write(dir) as any;
      onFolder.end({
        a: 1,
      });
      await expect(finished(onFolder)).rejects.toMatchObject({
        code: 'EISDIR',
      });
      const failing = write(join(dir, 'c.jsonl')) as any;
      const flushFailure = new Error('flush');
      failing._flush = (done: (error?: Error) => void) => done(flushFailure);
      failing.end();
      await expect(finished(failing)).rejects.toBe(flushFailure); // the rows' own failure, before the file's
      const underFile = write(join(file, 'b.jsonl')) as any;
      underFile.end();
      await expect(finished(underFile)).rejects.toMatchObject({
        code: 'EEXIST',
      });
    } finally {
      rmSync(dir, {
        recursive: true,
      });
    }
  });
});
