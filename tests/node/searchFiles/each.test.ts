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
  each, 
} from '../../../src/node/searchFiles/each';

function makeTree() {
  const root = join(tmpdir(), `fundamentool-each-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(
    root, 'subdir', 'nested',
  ), {
    recursive: true, 
  });
  writeFileSync(join(root, 'a.txt'), '');
  writeFileSync(join(root, 'b.txt'), '');
  writeFileSync(join(
    root, 'subdir', 'c.ts',
  ), '');
  writeFileSync(join(
    root, 'subdir', 'nested', 'd.ts',
  ), '');
  return root;
}

describe('node/searchFiles/each', () => {
  test('visits all files recursively', async () => {
    const root = makeTree();
    const found: string[] = [];
    await each(root, {
      iteratee: (p) => found.push(p), 
    });
    expect(found.length).toBe(4);
    rmSync(root, {
      recursive: true, 
    });
  });

  test('resolves when scan is complete', async () => {
    const root = makeTree();
    await expect(each(root, {})).resolves.toBeUndefined();
    rmSync(root, {
      recursive: true, 
    });
  });

  test('filter can exclude directories by name', async () => {
    const root = makeTree();
    const found: string[] = [];
    await each(root, {
      filter: (name, isDir) => !(isDir && name === 'nested'),
      iteratee: (p) => found.push(p),
    });
    // a.txt, b.txt, subdir/c.ts — nested/ excluded
    expect(found.length).toBe(3);
    rmSync(root, {
      recursive: true, 
    });
  });

  test('filter can restrict to .ts files only', async () => {
    const root = makeTree();
    const found: string[] = [];
    await each(root, {
      filter: (name, isDir) => isDir || name.endsWith('.ts'),
      iteratee: (p) => found.push(p),
    });
    expect(found.every((p) => p.endsWith('.ts'))).toBe(true);
    expect(found.length).toBe(2);
    rmSync(root, {
      recursive: true, 
    });
  });

  test('resolves immediately for empty directory', async () => {
    const root = join(tmpdir(), `fundamentool-each-empty-${Date.now()}`);
    mkdirSync(root, {
      recursive: true, 
    });
    const found: string[] = [];
    await each(root, {
      iteratee: (p) => found.push(p), 
    });
    expect(found).toEqual([]);
    rmSync(root, {
      recursive: true, 
    });
  });

  test('resolves without error for non-existing path', async () => {
    await expect(each(join(tmpdir(), 'no-such-dir-xyz'), {})).resolves.toBeUndefined();
  });
});
