import {
  tmpdir, 
} from 'os';
import {
  join, 
} from 'path';
import {
  mkdirSync, rmSync, 
} from 'fs';
import * as json from '../../../src/node/file/json';

function tmpDir() {
  const dir = join(tmpdir(), `fundamentool-json-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, {
    recursive: true, 
  });
  return dir;
}

describe('node/file/json — write & read', () => {
  test('writes and reads a plain object', async () => {
    const dir = tmpDir();
    const path = join(dir, 'data');
    await json.write(path, {
      name: 'Alice',
      age: 30, 
    });
    const result = await json.read(path);
    expect(result).toEqual({
      name: 'Alice',
      age: 30, 
    });
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('appends .json extension', async () => {
    const dir = tmpDir();
    const path = join(dir, 'config');
    await json.write(path, {
      x: 1, 
    });
    const {
      existsSync, 
    } = require('fs');
    expect(existsSync(path + '.json')).toBe(true);
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('minify option writes compact JSON', async () => {
    const dir = tmpDir();
    const path = join(dir, 'mini');
    await json.write(
      path, {
        a: 1, 
      }, {
        minify: true, 
      },
    );
    const {
      readFileSync, 
    } = require('fs');
    const raw = readFileSync(path + '.json', 'utf8');
    expect(raw).toBe('{"a":1}');
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('default writes pretty-printed JSON', async () => {
    const dir = tmpDir();
    const path = join(dir, 'pretty');
    await json.write(path, {
      a: 1, 
    });
    const {
      readFileSync, 
    } = require('fs');
    const raw = readFileSync(path + '.json', 'utf8');
    expect(raw).toContain('\n');
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('read rejects for missing file', async () => {
    await expect(json.read(join(tmpdir(), 'no-such-file'))).rejects.toThrow();
  });
});

describe('node/file/json/snapshot — write & read', () => {
  test('writes main and .recov files', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    await json.snapshot.write(path, {
      v: 1, 
    });
    const {
      existsSync, 
    } = require('fs');
    expect(existsSync(path + '.json')).toBe(true);
    expect(existsSync(path + '.recov.json')).toBe(true);
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('reads main file when available', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    await json.snapshot.write(path, {
      val: 42, 
    });
    expect(await json.snapshot.read(path)).toEqual({
      val: 42, 
    });
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('falls back to .recov when main is corrupt', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    await json.snapshot.write(path, {
      val: 99, 
    });
    const {
      writeFileSync, 
    } = require('fs');
    writeFileSync(path + '.json', 'BROKEN');
    const result = await json.snapshot.read(path);
    expect(result).toEqual({
      val: 99, 
    });
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('returns onInit() result when both copies are missing', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    const result = await json.snapshot.read(path, () => ({
      default: true, 
    }));
    expect(result).toEqual({
      default: true, 
    });
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('returns null when both copies are missing and no onInit', async () => {
    const dir = tmpDir();
    const path = join(dir, 'snap');
    const result = await json.snapshot.read(path);
    expect(result).toBeNull();
    rmSync(dir, {
      recursive: true, 
    });
  });
});
