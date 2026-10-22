/**
 * Reading a file by slices without keeping it open (`readSlice`), the stream over it (`readUnopened`), and the JSON Lines
 * reader built on them — over a fixture folder of the test's own.
 */
import {
  execFileSync,
} from 'child_process';
import {
  mkdtempSync,
  openSync,
  closeSync,
  rmSync,
  writeFileSync,
} from 'fs';
import {
  join,
} from 'path';
import {
  readSlice,
} from '../../../src/node/file/readSlice';
import {
  readUnopened,
} from '../../../src/node/file/readUnopened';
import {
  readUnopened as readJsonlUnopened,
} from '../../../src/node/jsonl/promisify/readUnopened';

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(__dirname, 'fixtures-readslice-'));
});
afterAll(() => {
  rmSync(dir, {
    recursive: true,
    force: true,
  });
});

describe('readSlice', () => {
  it('reads slice after slice — a full slice, a short one, then null at the end', async () => {
    const file = join(dir, 'ten.txt');
    writeFileSync(file, '0123456789');
    const first = await readSlice(
      file, 0, 6,
    );
    expect(first.buffer?.toString()).toBe('012345');
    expect(first.position).toBe(6);
    const second = await readSlice(
      file, first.position, 6,
    );
    expect(second.buffer?.toString()).toBe('6789');
    const end = await readSlice(
      file, second.position, 6,
    );
    expect(end).toEqual({
      buffer: null,
      position: 10,
    });
  });

  it('a missing file rejects; an abort rejects at once', async () => {
    await expect(readSlice(join(dir, 'missing.txt'))).rejects.toThrow(/ENOENT/);
    const file = join(dir, 'abort.txt');
    writeFileSync(file, 'abc');
    const controller = new AbortController();
    const reading = readSlice(
      file, 0, 4, 60000, 0, controller.signal,
    );
    controller.abort();
    await expect(reading).rejects.toThrow('aborted');
  });

  it('an open that never ends times out — retried, then rejected', async () => {
    const fifo = join(dir, 'pipe');
    execFileSync('mkfifo', [fifo]);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(readSlice(
        fifo, 0, 4, 20, 1,
      )).rejects.toThrow(/File read timed out/);
      expect(error).toHaveBeenCalledTimes(1); // the one retry
    } finally {
      error.mockRestore();
      closeSync(openSync(fifo, 'w')); // a writer: the waiting opens end
    }
  });
});

describe('readUnopened', () => {
  it('streams the file in chunks to its end; a missing file ends the stream', async () => {
    const file = join(dir, 'stream.txt');
    writeFileSync(file, 'abcdefghij');
    const chunks: string[] = [];
    await new Promise<void>((done) => {
      readUnopened(file, {
        bufferLength: 3,
      }).on('data', (chunk: Buffer) => chunks.push(chunk.toString())).on('end', done);
    });
    expect(chunks.join('')).toBe('abcdefghij');
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await new Promise<void>((done) => {
        readUnopened(join(dir, 'missing.txt')).on('data', () => undefined).on('end', done);
      });
      expect(error).toHaveBeenCalledWith('ReadUnopened', expect.objectContaining({
        code: 'ENOENT',
      })); // fs's own Error — another realm's class
    } finally {
      error.mockRestore();
    }
  });

  it('a read asked for while one is in flight runs after it — the bytes whole, in order', async () => {
    const file = join(dir, 'asked-twice.txt');
    writeFileSync(file, 'abcdefghij');
    const stream = readUnopened(file, {
      bufferLength: 4,
    });
    const chunks: string[] = [];
    const ended = new Promise<void>((done) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString())).on('end', done);
    });
    (stream as any)._read(); // a second ask while the first slice is read
    await ended;
    expect(chunks.join('')).toBe('abcdefghij');
  });

  it('the JSON Lines reader gives the items; onReadable hears the stream', async () => {
    const file = join(dir, 'items.jsonl');
    writeFileSync(file, '{"a":1}\n{"a":2}\n');
    const readable = jest.fn();
    await expect(readJsonlUnopened(
      file, {
        bufferLength: 4,
      }, readable,
    )).resolves.toEqual([
      {
        a: 1,
      },
      {
        a: 2,
      },
    ]);
    expect(readable).toHaveBeenCalled();
    await expect(readJsonlUnopened(file)).resolves.toHaveLength(2);
  });
});
