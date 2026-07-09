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
  scanPath, 
} from '../../src/node/scanPath';

function makeTree() {
  const root = join(tmpdir(), `fundamentool-scan-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(root, 'sub'), {
    recursive: true, 
  });
  writeFileSync(join(root, 'a.ts'), '');
  writeFileSync(join(root, 'b.ts'), '');
  writeFileSync(join(
    root, 'sub', 'c.ts',
  ), '');
  return root;
}

describe('node/scanPath', () => {
  test('calls each("found", path) for every file', async () => {
    const root = makeTree();
    const events: [string, string][] = [];
    await scanPath({
      path: root,
      each: (event, p) => events.push([event, p]), 
    });
    expect(events.length).toBe(3);
    expect(events.every(([ev]) => ev === 'found')).toBe(true);
    rmSync(root, {
      recursive: true, 
    });
  });

  test('exclude predicate filters files', async () => {
    const root = makeTree();
    const found: string[] = [];
    await scanPath({
      path: root,
      each: (_, p) => found.push(p),
      exclude: (p) => p.includes('sub'),
    });
    expect(found.length).toBe(2);
    rmSync(root, {
      recursive: true, 
    });
  });

  test('works without each or exclude', async () => {
    const root = makeTree();
    await expect(scanPath({
      path: root, 
    })).resolves.toBeUndefined();
    rmSync(root, {
      recursive: true, 
    });
  });
});
