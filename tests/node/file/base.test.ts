import {
  tmpdir, 
} from 'os';
import {
  join, 
} from 'path';
import {
  rmSync, mkdirSync, 
} from 'fs';
import {
  access, makeDir, write, read, readDir, 
} from '../../../src/node/file/base';

function tmpDir() {
  const dir = join(tmpdir(), `fundamentool-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, {
    recursive: true, 
  });
  return dir;
}

describe('node/file/base — access', () => {
  test('returns true for existing readable file', async () => {
    const dir = tmpDir();
    const path = join(dir, 'a.txt');
    await write(path, 'hello');
    expect(await access(path)).toBe(true);
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('returns false for non-existing file', async () => {
    expect(await access(join(tmpdir(), 'definitely-not-existing-file.txt'))).toBe(false);
  });
});

describe('node/file/base — makeDir', () => {
  test('creates nested directories', async () => {
    const dir = join(
      tmpdir(), `fundamentool-mkdir-${Date.now()}`, 'a', 'b', 'c',
    );
    await expect(makeDir(dir)).resolves.toBeUndefined();
    expect(await access(dir)).toBe(true);
    rmSync(join(tmpdir(), `fundamentool-mkdir-${Date.now().toString().slice(0, -3)}000`), {
      recursive: true,
      force: true, 
    });
  });

  test('does not throw if directory already exists', async () => {
    const dir = tmpDir();
    await expect(makeDir(dir)).resolves.toBeUndefined();
    rmSync(dir, {
      recursive: true, 
    });
  });
});

describe('node/file/base — write & read', () => {
  test('writes and reads utf8 text', async () => {
    const dir = tmpDir();
    const path = join(dir, 'test.txt');
    await write(path, 'hello world');
    expect(await read(path)).toBe('hello world');
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('write creates parent directories automatically', async () => {
    const dir = tmpDir();
    const path = join(
      dir, 'deep', 'nested', 'file.txt',
    );
    await write(path, 'nested');
    expect(await read(path)).toBe('nested');
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('overwrites existing file', async () => {
    const dir = tmpDir();
    const path = join(dir, 'file.txt');
    await write(path, 'first');
    await write(path, 'second');
    expect(await read(path)).toBe('second');
    rmSync(dir, {
      recursive: true, 
    });
  });
});

describe('node/file/base — readDir', () => {
  test('lists files in directory', async () => {
    const dir = tmpDir();
    await write(join(dir, 'a.txt'), '');
    await write(join(dir, 'b.txt'), '');
    const files = await readDir(dir) as string[];
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
    rmSync(dir, {
      recursive: true, 
    });
  });

  test('rejects for non-existing directory', async () => {
    await expect(readDir(join(tmpdir(), 'no-such-dir-xyz'))).rejects.toThrow();
  });
});
