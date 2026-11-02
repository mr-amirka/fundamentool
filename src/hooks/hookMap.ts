import {
  nearestKnown,
} from '../assertKnownOptions';
import {
  hasOwn,
} from '../hasOwn';
import {
  WHERE,
  checkFunction,
} from './options';
import type {
  THook,
  THookMap,
  TNamedHooks,
} from './types';

/**
 * Hooks by key, keys not known in advance — a handler per SQL node kind, a kind a preset brings. A key's hook is made
 * by `create` the first time it is asked for with `for`.
 *
 * @param create - Makes the hook of a key.
 * @returns `for(key)` — the key's hook, made if needed; `get(key)` — without making one; `keys()`.
 * @example
 * const nodes = hookMap((kind: string) => chainHook<TNode, string>({ name: `[fundamentool/sql] node "${kind}"` }));
 * nodes.for('json-get').add((n) => `json_extract(${n.of}, '$.${n.path.join('.')}')`, { by: 'sqlite' });
 * nodes.get('text-match'); // undefined — no preset brought it
 * nodes.keys();            // ['json-get']
 */
export function hookMap<K extends string, H>(create: (key: K) => H): THookMap<K, H> {
  checkFunction(create, `${WHERE} hookMap: create`);
  const hooks = new Map<K, H>();
  return {
    for(key: K): H {
      let hook = hooks.get(key);
      if (hook === undefined) {
        hook = create(key);
        hooks.set(key, hook);
      }
      return hook;
    },
    get: (key: K): H | undefined => hooks.get(key),
    keys: (): K[] => [...hooks.keys()],
  };
}

/**
 * A host's hooks by name, for its presets: `host.add('beforeWrite', fn)` — an unknown name is an error with the nearest
 * known one, not `Cannot read properties of undefined`.
 *
 * @param hooks - The host's hooks, by name.
 * @param where - The prefix of a message: `[documents]`.
 * @returns `add(name, handler, options)` → its removal, `has(name)`, `names()`.
 * @throws {TypeError} from `add`: `[documents]: unknown hook "beforeWirte". Did you mean "beforeWrite"? Hooks: …`.
 * @example
 * const host = namedHooks({ beforeWrite, afterWrite }, '[documents]');
 * host.add('beforeWrite', stamp, { by: 'presetLabRecords' });
 */
export function namedHooks<M extends Record<string, THook<any>>>(hooks: M, where: string): TNamedHooks<M> {
  const names = Object.keys(hooks);
  const hookOf = (name: string): THook<any> => {
    if (hasOwn(hooks, name)) {
      return hooks[name];
    }
    const near = nearestKnown(name, names);
    throw new TypeError(`${where}: unknown hook "${name}".${near ? ` Did you mean "${near}"?` : ''} Hooks: ${names.join(', ')}`);
  };
  return {
    add: (
      name, handler, options,
    ) => hookOf(name).add(handler, options),
    has: (name) => hasOwn(hooks, name),
    names: () => names.slice(),
  };
}
