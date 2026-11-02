import {
  nearestKnown,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import {
  hasOwn,
} from '../hasOwn';
import {
  hookMap,
} from '../hooks/hookMap';
import {
  chainHook,
} from '../hooks/hooks';
import {
  orderPresets,
  presetSetup,
} from '../hooks/orderPresets';
import type {
  TChainHook,
} from '../hooks/types';
import {
  atPath,
} from '../match/normalizeMatch';
import {
  BASE_NODES,
  baseIdent,
  baseLiteral,
  baseParam,
  baseValue,
} from './base';
import {
  isSqlNode,
} from './nodes';
import {
  WHERE,
  checkOptions,
} from './options';
import type {
  TCompiled,
  TDialectHost,
  TNodeHandler,
  TPrimitives,
  TSqlCompiler,
  TSqlCompilerOptions,
  TSqlContext,
  TSqlDialect,
  TSqlNode,
} from './types';

/** The prefix of an operator's node kind: `match:$eq`. */
export const MATCH_KIND = 'match:';

/** What one `compile` collects: a value per placeholder, the name of each named one, and the first error. */
type TState = {
  params: unknown[];
  names: (string | undefined)[];
  /** The innermost error, where it happened — rethrown as is, not wrapped by every handler it passed. */
  failure: unknown;
};

/** The primitives' chains. */
type TPrimitiveHooks = { [P in keyof TPrimitives]: TChainHook<TPrimitives[P][0], TPrimitives[P][1]> };

/** The primitives' own forms — each chain's end. */
const BASE_PRIMITIVES: { [P in keyof TPrimitives]: (input: TPrimitives[P][0]) => TPrimitives[P][1] } = {
  param: baseParam,
  ident: baseIdent,
  literal: baseLiteral,
  value: baseValue,
};

const PRIMITIVE_NAMES = Object.keys(BASE_PRIMITIVES);

/** Between the items of a list. */
const COMMA = ', ';

/**
 * A dialect, or a preset over one, checked: `{ name, requires?, setup(d) }`. `d.node(kind, handler)` writes a node kind
 * (`c.base()` reaches the handler it replaced), `d.primitive(name, handler)` replaces `param` / `ident` / `literal` /
 * `value`, `d.function(name, fn)` declares a function the dialect's SQL calls.
 *
 * @param preset - The dialect.
 * @returns The same object.
 * @throws {TypeError} in development: an unknown key, a missing `name` or `setup`.
 * @example
 * const postgres = sqlDialect({ name: 'postgres', setup(d) {
 *   d.primitive('param', (index) => `$${index + 1}`);
 *   d.node('json-get', (n, c) => `${c.compile(n.of)}->>${c.literal(n.path[0])}`);
 * } });
 */
export function sqlDialect(preset: TSqlDialect): TSqlDialect {
  checkOptions('sqlDialect', preset);
  return preset;
}

/**
 * A compiler: a query tree → `{ text, params, names }`, written by its presets over the forms SQLite and PostgreSQL
 * share. Each node kind is a chain of handlers (`fundamentool/hooks`' `chainHook` in a `hookMap`): a later preset is asked
 * first. Compile once, bind per call: `bind(compiled, { file })`.
 *
 * @param options - `presets`: dialects and presets over them, ordered by what they `require`.
 * @returns `compile(node)`, `bind(compiled, values)`, `ident(name)`, `functions`.
 * @throws {TypeError} a preset requiring one not given, two with one name (`orderPresets`); in development, an unknown
 * option.
 * @example
 * const compiler = sqlCompiler({ presets: [sqlite] });
 * const q = compiler.compile(selectFrom('nodes', { where: eq(col('file'), param('file')) }));
 * // { text: 'SELECT * FROM "nodes" WHERE "file" = ?', params: [undefined], names: ['file'] }
 * compiler.bind(q, { file: 'PLAN.md' }); // => ['PLAN.md']
 */
export function sqlCompiler(options?: TSqlCompilerOptions): TSqlCompiler {
  checkOptions('sqlCompiler', options);
  const where = `${WHERE} sqlCompiler`;
  const presets = orderPresets(options?.presets || [], {
    where,
  });
  // The compiler is pure work on a hot path, so its chains are `fundamentool/hooks`' sync ones (lab D-046 point 2,
  // D-050): no dialect needs I/O to write a node's text.
  const nodes = hookMap((kind: string) => chainHook<TSqlNode, string>({
    name: `${WHERE} node "${kind}"`,
  }));
  const primitives: TPrimitiveHooks = {
    param: chainHook({
      name: `${WHERE} primitive "param"`,
    }),
    ident: chainHook({
      name: `${WHERE} primitive "ident"`,
    }),
    literal: chainHook({
      name: `${WHERE} primitive "literal"`,
    }),
    value: chainHook({
      name: `${WHERE} primitive "value"`,
    }),
  };
  const functions: Record<string, (...args: any[]) => unknown> = {};
  let by: string | undefined;
  let state: TState | undefined;

  const placeholder = (index: number): string => primitives.param.run(index, BASE_PRIMITIVES.param);
  const ident = (name: string): string => primitives.ident.run(name, BASE_PRIMITIVES.ident);
  const literal = (value: string | number): string => primitives.literal.run(value, BASE_PRIMITIVES.literal);
  const valueOf = (value: unknown): unknown => primitives.value.run(value, BASE_PRIMITIVES.value);

  /** Runs `step`, keeping its error as the compile's failure if none was kept. */
  const guarded = <T>(step: () => T): T => {
    try {
      return step();
    } catch (error) {
      const current = state as TState;
      if (current.failure === undefined) {
        current.failure = error;
      }
      throw error;
    }
  };

  const slot = (value: unknown, name: string | undefined): string => {
    const current = state as TState;
    current.params.push(value);
    current.names.push(name);
    return placeholder(current.params.length - 1);
  };

  const context = (base: (node?: TSqlNode) => string): TSqlContext => ({
    compile: write,
    param: (value) => guarded(() => slot(valueOf(value), undefined)),
    named: (name) => guarded(() => slot(undefined, name)),
    ident: (name) => guarded(() => ident(name)),
    literal: (value) => guarded(() => literal(value)),
    list: (list, separator = COMMA) => list.map(write).join(separator),
    base,
  });

  function unknownNode(node: TSqlNode): TypeError {
    const kind = node.kind;
    if (kind.startsWith(MATCH_KIND)) {
      const operator = kind.slice(MATCH_KIND.length);
      return new TypeError(`${WHERE} compile: no SQL for the operator "${operator}" ${atPath((node.path || []) as string[])} — a dialect preset adds it with d.node('${kind}', …)`);
    }
    const known = Object.keys(BASE_NODES).concat(nodes.keys().filter((key) => !hasOwn(BASE_NODES, key)));
    const near = nearestKnown(kind, known);
    return new TypeError(`${WHERE} compile: no handler for the node "${kind}".${near ? ` Did you mean "${near}"?` : ''} Nodes: ${known.join(COMMA)}`);
  }

  function write(node: TSqlNode): string {
    return guarded(() => {
      if (!isSqlNode(node)) {
        throw new TypeError(`${WHERE} compile: expects a node { kind, … }, got ${describeValue(node)}`);
      }
      const hook = nodes.get(node.kind);
      const base: TNodeHandler | undefined = hasOwn(BASE_NODES, node.kind) ? BASE_NODES[node.kind] : undefined;
      if (base === undefined && (hook === undefined || hook.size === 0)) {
        throw unknownNode(node);
      }
      const noBelow = (): string => {
        throw new Error(`${WHERE} node "${node.kind}": c.base() — no handler below this one`);
      };
      const end = (value: TSqlNode): string => (base === undefined ? noBelow() : base(value, context(noBelow)));
      return hook && hook.size > 0 ? hook.run(node, end) : end(node);
    });
  }

  const host: TDialectHost = {
    node(kind, handler) {
      if (typeof kind !== 'string' || kind === '' || typeof handler !== 'function') {
        throw new TypeError(`${where}: d.node(kind, handler) expects a kind and a function, got ${describeValue(kind)}, ${describeValue(handler)}`);
      }
      nodes.for(kind).add((node, next) => (handler as TNodeHandler)(node, context(next)), {
        by,
      });
    },
    primitive(name, handler) {
      if (!hasOwn(primitives, name)) {
        const near = nearestKnown(String(name), PRIMITIVE_NAMES);
        throw new TypeError(`${where}: unknown primitive "${String(name)}".${near ? ` Did you mean "${near}"?` : ''} Primitives: ${PRIMITIVE_NAMES.join(COMMA)}`);
      }
      (primitives[name] as TChainHook<unknown, unknown>).add(handler as (input: unknown, next: (input?: unknown) => unknown) => unknown, {
        by,
      });
    },
    function(name, implementation) {
      if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || typeof implementation !== 'function') {
        throw new TypeError(`${where}: d.function(name, fn) expects a word and a function, got ${describeValue(name)}, ${describeValue(implementation)}`);
      }
      functions[name] = implementation;
    },
  };
  for (const preset of presets) {
    by = typeof preset === 'function' ? undefined : preset.name;
    presetSetup(preset)(host);
  }
  by = undefined;

  /** The names a compiled query takes, for `bind`'s "did you mean" — counted once per query. */
  const namesOf = new WeakMap<TCompiled, string[]>();

  return {
    compile(node) {
      const outer = state;
      const current: TState = {
        params: [],
        names: [],
        failure: undefined,
      };
      state = current;
      try {
        const text = write(node);
        return {
          text,
          params: current.params,
          names: current.names,
        };
      } catch {
        // `write` keeps every error it lets out: the innermost one, where it happened.
        throw current.failure;
      } finally {
        state = outer;
      }
    },
    bind(compiled, values) {
      const params = compiled.params;
      const slots = compiled.names;
      const length = params.length;
      const out = new Array(length);
      let i = 0;
      for (; i < length; i++) {
        const name = slots[i];
        if (name === undefined) {
          out[i] = params[i];
        } else if (values !== undefined && hasOwn(values, name)) {
          out[i] = valueOf(values[name]);
        } else {
          throw new TypeError(`${WHERE} bind: no value for "${name}"`);
        }
      }
      if (values !== undefined) {
        let known = namesOf.get(compiled);
        if (known === undefined) {
          known = slots.filter((name): name is string => name !== undefined);
          namesOf.set(compiled, known);
        }
        for (const key in values) {
          if (hasOwn(values, key) && !known.includes(key)) {
            const near = nearestKnown(key, known);
            throw new TypeError(`${WHERE} bind: unknown parameter "${key}".${near ? ` Did you mean "${near}"?` : ''} Parameters: ${known.join(COMMA) || 'none'}`);
          }
        }
      }
      return out;
    },
    ident,
    functions,
  };
}
