import {
  chainHook,
  eachHook,
  hookMap,
  namedHooks,
  waterfallHook,
} from '../../src/hooks';

describe('hookMap — hooks by key (H6)', () => {
  test('for makes a key\'s hook once; get does not make one; keys in the order made', () => {
    const create = jest.fn((kind: string) => chainHook<string, string>({
      name: `[sql] node "${kind}"`,
    }));
    const nodes = hookMap(create);
    expect(nodes.get('eq')).toBeUndefined();
    const eq = nodes.for('eq');
    expect(nodes.for('eq')).toBe(eq);
    nodes.for('json-get');
    expect(nodes.get('eq')).toBe(eq);
    expect(nodes.keys()).toEqual([
      'eq',
      'json-get',
    ]);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith('eq');
  });

  test('a preset brings a kind of its own', () => {
    const nodes = hookMap((kind: string) => chainHook<string, string>({
      name: kind,
    }));
    nodes.for('text-match').add((n) => `match(${n})`, {
      by: 'presetFts',
    });
    expect(nodes.for('text-match').run('body', String)).toBe('match(body)');
  });

  test('create must be a function (development)', () => {
    expect(() => hookMap(1 as never)).toThrow('[fundamentool/hooks] hookMap: create');
  });
});

describe('namedHooks — a host\'s hooks by name (H11)', () => {
  const host = () => {
    const hooks = {
      beforeWrite: waterfallHook<number>(),
      afterWrite: eachHook<number>(),
    };
    return [
      hooks,
      namedHooks(hooks, '[documents]'),
    ] as const;
  };

  test('add goes to the named hook and returns its removal', () => {
    const [
      hooks,
      named,
    ] = host();
    const off = named.add(
      'beforeWrite', (n) => n + 1, {
        by: 'presetX',
      },
    );
    expect(hooks.beforeWrite.run(1)).toBe(2);
    off();
    expect(hooks.beforeWrite.size).toBe(0);
  });

  test('an unknown name: the nearest known one and the list', () => {
    const [, named] = host();
    expect(() => named.add('beforeWirte' as never, (() => undefined) as never))
      .toThrow('[documents]: unknown hook "beforeWirte". Did you mean "beforeWrite"? Hooks: beforeWrite, afterWrite');
    expect(() => named.add('zzz' as never, (() => undefined) as never))
      .toThrow('[documents]: unknown hook "zzz". Hooks: beforeWrite, afterWrite');
  });

  test('has and names; a name of Object.prototype is not a hook', () => {
    const [, named] = host();
    expect(named.has('afterWrite')).toBe(true);
    expect(named.has('toString')).toBe(false);
    expect(() => named.add('toString' as never, (() => undefined) as never)).toThrow('unknown hook "toString"');
    const names = named.names();
    names.push('x');
    expect(named.names()).toEqual([
      'beforeWrite',
      'afterWrite',
    ]);
  });
});
