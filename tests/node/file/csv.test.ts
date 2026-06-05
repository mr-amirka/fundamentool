import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, unlinkSync } from 'fs';
import * as csv from '../../../src/node/file/csv';

function tmpDir() {
  const dir = join(tmpdir(), `fundamentool-csv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('node/file/csv — write & read', () => {
  test('writes and reads a 2D array', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data');
    await csv.write(path, [['a', 'b'], ['1', '2']]);
    const result = await csv.read(path);
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
    rmSync(dir, { recursive: true });
  });

  test('appends .csv extension', async () => {
    const dir = tmpDir();
    const path = join(dir, 'report');
    await csv.write(path, [['x']]);
    const { existsSync } = require('fs');
    expect(existsSync(path + '.csv')).toBe(true);
    rmSync(dir, { recursive: true });
  });

  test('read with output array pushes into it', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data');
    await csv.write(path, [['a'], ['b']]);
    const out: any[][] = [];
    await csv.read(path, out);
    expect(out).toEqual([['a'], ['b']]);
    rmSync(dir, { recursive: true });
  });

  test('readEachLine calls callback for each row', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data');
    await csv.write(path, [['r1c1', 'r1c2'], ['r2c1', 'r2c2']]);
    const rows: any[][] = [];
    await csv.readEachLine(path, (row) => rows.push(row));
    expect(rows).toEqual([['r1c1', 'r1c2'], ['r2c1', 'r2c2']]);
    rmSync(dir, { recursive: true });
  });

  test('read rejects for missing file', async () => {
    await expect(csv.read(join(tmpdir(), 'no-such-file'))).rejects.toThrow();
  });
});

describe('node/file/csv/snapshot — write & read', () => {
  test('writes main and .recov files', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    await csv.snapshot.write(path, [['v', '1']]);
    const { existsSync } = require('fs');
    expect(existsSync(path + '.csv')).toBe(true);
    expect(existsSync(path + '.recov.csv')).toBe(true);
    rmSync(dir, { recursive: true });
  });

  test('reads main file when available', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    await csv.snapshot.write(path, [['ok']]);
    const result = await csv.snapshot.read(path);
    expect(result).toEqual([['ok']]);
    rmSync(dir, { recursive: true });
  });

  test('falls back to .recov when main file is deleted', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    await csv.snapshot.write(path, [['good']]);
    unlinkSync(path + '.csv');
    const result = await csv.snapshot.read(path);
    expect(result).toEqual([['good']]);
    rmSync(dir, { recursive: true });
  });

  test('returns onInit() when both copies missing', async () => {
    const dir = tmpDir();
    const result = await csv.snapshot.read(join(dir, 'missing'), () => []);
    expect(result).toEqual([]);
    rmSync(dir, { recursive: true });
  });

  test('returns null when both copies missing and no onInit', async () => {
    const dir = tmpDir();
    const result = await csv.snapshot.read(join(dir, 'missing'));
    expect(result).toBeNull();
    rmSync(dir, { recursive: true });
  });
});
