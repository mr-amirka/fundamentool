import {
  keyedRegistry,
} from '../src/keyedRegistry';

describe('keyedRegistry', () => {
  it('add / list / has by key; each add returns its own removal', () => {
    const registry = keyedRegistry<number, string>();
    const offA = registry.add(1, 'a');
    registry.add(1, 'b');
    registry.add(2, 'c');
    expect(registry.list(1)).toEqual([
      'a',
      'b',
    ]);
    expect(registry.has(2)).toBe(true);
    offA();
    offA(); // twice is harmless
    expect(registry.list(1)).toEqual(['b']);
    expect(registry.list(3)).toEqual([]);
    expect(registry.has(3)).toBe(false);
  });

  it('list is a copy: items may be removed while iterating', () => {
    const registry = keyedRegistry<string, () => void>();
    const seen: string[] = [];
    const off = registry.add('k', () => {
      seen.push('first');
      off();
    });
    registry.add('k', () => seen.push('second'));
    registry.list('k').forEach((fn) => fn());
    expect(seen).toEqual([
      'first',
      'second',
    ]);
    expect(registry.list('k')).toHaveLength(1);
  });

  it('forget drops a key with all its items; an old removal stays harmless', () => {
    const registry = keyedRegistry<string, number>();
    const off = registry.add('k', 1);
    registry.forget('k');
    expect(registry.has('k')).toBe(false);
    off();
    expect(registry.list('k')).toEqual([]);
  });
});
