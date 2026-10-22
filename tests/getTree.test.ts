import {
  getTree,
} from '../src/getTree';

describe('getTree', () => {
  const items = [
    {
      id: 1,
      parent: null,
    },
    {
      id: 2,
      parent: 1,
    },
    {
      id: 3,
      parent: 1,
    },
    {
      id: 4,
      parent: 2,
    },
  ];

  test('builds top-level nodes', () => {
    const tree = getTree(items, null);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(1);
  });

  test('populates childs array for parent node', () => {
    const tree = getTree(items, null);
    expect(tree[0].childs).toHaveLength(2);
    expect(tree[0].childs.map((c: any) => c.id).sort()).toEqual([
      2,
      3,
    ]);
  });

  test('recursively builds nested childs', () => {
    const tree = getTree(items, null);
    const node2 = tree[0].childs.find((c: any) => c.id === 2);
    expect(node2.childs).toHaveLength(1);
    expect(node2.childs[0].id).toBe(4);
  });

  test('returns empty array for unknown parent id', () => {
    expect(getTree(items, 999)).toEqual([]);
  });

  test('handles null/undefined src', () => {
    expect(getTree(null, null)).toEqual([]);
    expect(getTree(undefined, null)).toEqual([]);
  });

  test('writes into provided dst array', () => {
    const dst: any[] = [];
    getTree(
      items, null, dst,
    );
    expect(dst).toHaveLength(1);
  });

  it('no list: none; an item without an id has no children; the depth cuts the tree (the deepest level as it is)', () => {
    expect(getTree(null, null)).toEqual([]);
    const dst = ['kept'];
    expect(getTree(
      undefined, null, dst,
    )).toBe(dst);
    expect(getTree([
      {
        parent: null,
      },
    ], null)).toEqual([
      {
        parent: null,
        childs: [],
      },
    ]);
    const [root] = getTree(
      items, null, [], 2,
    );
    const two = root.childs.find((c: any) => c.id === 2);
    expect(two).toEqual({
      id: 2,
      parent: 1,
    }); // depth 2: the second level without its childs
  });
});
