// The four kinds of hook, sync (fundamentool D-087, D-091): for a host whose every handler is pure work — the SQL
// compiler writing a node. A host whose handlers may wait takes `fundamentool/async/hooks`, the same kinds with the same
// names (lab D-050: a mode the caller picks once is a module of its own).
import {
  responsibilityChain,
} from '../responsibilityChain';
import {
  NOTHING_PASSED,
  asIs,
  handlerList,
  hookError,
  whereOf,
} from './list';
import {
  checkHookOptions,
} from './options';
import type {
  TBailHandler,
  TBailHook,
  TChainHandler,
  TChainHook,
  TEachHandler,
  TEachHook,
  THookOptions,
  TWaterfallHandler,
  TWaterfallHook,
} from './types';

export {
  hookError,
} from './list';

/**
 * A chain's handler kept so its own throw is named, and an error coming out of `next` — another handler's, already
 * named, or `end`'s — passes through it unchanged.
 */
function namedLink<T, R>(
  handler: TChainHandler<T, R>, by: string | undefined, name: string,
): TChainHandler<T, R> {
  return (value, next) => {
    let passed: unknown = NOTHING_PASSED;
    const onward = (changed?: T): R => {
      try {
        return next(changed);
      } catch (error) {
        passed = error;
        throw error;
      }
    };
    try {
      return handler(value, onward);
    } catch (error) {
      if (error === passed) {
        throw error;
      }
      throw hookError(
        name, by, error,
      );
    }
  };
}

/**
 * A hook every handler of which is told and none answers — `afterParse`. Handlers run in the order added (`pre` first,
 * `post` last).
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add(handler, { order, by })` → its removal, `run(value)`, `size`.
 * @throws {Error} from `run`: a handler's throw, named — `[sql] afterParse: the handler of presetX threw: …`; the
 * handlers after it don't run.
 * @example
 * const afterParse = eachHook<TTree>({ name: '[documents] afterParse' });
 * afterParse.add((tree) => { counts.set(tree.file, tree.size); }, { by: 'presetCounts' });
 * afterParse.run(tree);
 */
export function eachHook<T>(options?: THookOptions): TEachHook<T> {
  checkHookOptions(options, whereOf('eachHook'));
  const [
    list,
    add,
  ] = handlerList<TEachHandler<T>, TEachHandler<T>>(
    options, false, asIs,
  );
  return {
    add,
    get size() {
      return list.current[0].length;
    },
    run(value: T): void {
      const current = list.current;
      const handlers = current[0];
      const length = handlers.length;
      let i = 0;
      try {
        for (; i < length; i++) {
          handlers[i](value);
        }
      } catch (error) {
        throw hookError(
          list.name, current[1][i], error,
        );
      }
    },
  };
}

/**
 * A hook whose handlers change a value in turn — `normalize`: each gets what the previous one returned, and
 * `undefined` keeps the value. Handlers run in the order added, so a later preset sees what the earlier ones did.
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add`, `run(value)` → the value the last handler left, `size`.
 * @throws {Error} from `run`: a handler's throw, named.
 * @example
 * const normalize = waterfallHook<string>({ name: '[sql] normalize' });
 * normalize.add((text) => text.trim());
 * normalize.add((text) => (text.endsWith(';') ? undefined : `${text};`));
 * normalize.run(' SELECT 1 '); // 'SELECT 1;'
 */
export function waterfallHook<T>(options?: THookOptions): TWaterfallHook<T> {
  checkHookOptions(options, whereOf('waterfallHook'));
  const [
    list,
    add,
  ] = handlerList<TWaterfallHandler<T>, TWaterfallHandler<T>>(
    options, false, asIs,
  );
  return {
    add,
    get size() {
      return list.current[0].length;
    },
    run(value: T): T {
      const current = list.current;
      const handlers = current[0];
      const length = handlers.length;
      let result = value;
      let changed: T | undefined;
      let i = 0;
      try {
        for (; i < length; i++) {
          changed = handlers[i](result);
          if (changed !== undefined) {
            result = changed;
          }
        }
      } catch (error) {
        throw hookError(
          list.name, current[1][i], error,
        );
      }
      return result;
    },
  };
}

/**
 * A hook answered by the first handler that knows — `quote(name)`: a handler returns its answer, or `undefined` to let
 * the next one answer. The latest added is asked first, so a later preset answers instead of an earlier one.
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add`, `run(value)` → the first answer, or `undefined` — nobody knew; `size`.
 * @throws {Error} from `run`: a handler's throw, named.
 * @example
 * const quote = bailHook<string, string>({ name: '[sql] quote' });
 * quote.add((name) => `"${name}"`, { by: 'ansi' });
 * quote.add((name) => (name.includes('.') ? undefined : `\`${name}\``), { by: 'mysql' });
 * quote.run('users'); // '`users`' — mysql answered
 * quote.run('a.b');   // '"a.b"' — mysql passed, ansi answered
 */
export function bailHook<T, R>(options?: THookOptions): TBailHook<T, R> {
  checkHookOptions(options, whereOf('bailHook'));
  const [
    list,
    add,
  ] = handlerList<TBailHandler<T, R>, TBailHandler<T, R>>(
    options, true, asIs,
  );
  return {
    add,
    get size() {
      return list.current[0].length;
    },
    run(value: T): R | undefined {
      const current = list.current;
      const handlers = current[0];
      const length = handlers.length;
      let answer: R | undefined;
      let i = 0;
      try {
        for (; i < length; i++) {
          answer = handlers[i](value);
          if (answer !== undefined) {
            return answer;
          }
        }
      } catch (error) {
        throw hookError(
          list.name, current[1][i], error,
        );
      }
      return undefined;
    },
  };
}

/**
 * A hook whose handlers wrap the rest — middleware: a handler does something, calls `next` to reach the handlers after
 * it (`next()` — with the same value), and does something with their answer; or answers without calling `next`. The
 * latest added is outermost, so a later preset replaces an earlier one and reaches it through `next` (a SQL dialect over
 * the ANSI form).
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add`, `run(value, end)` → the outermost handler's answer (`end(value)` when there is none),
 * `size`.
 * @throws {Error} from `run`: a handler's throw, named once, where it happened.
 * @example
 * const node = chainHook<TNode, string>({ name: '[fundamentool/sql] node "json-get"' });
 * node.add((n) => `json_extract(${n.of}, '$.${n.path.join('.')}')`, { by: 'sqlite' });
 * node.add((n, next) => (n.path.length === 1 ? `${n.of}->>'${n.path[0]}'` : next()), { by: 'postgres' });
 * node.run({ of: 'attrs', path: ['status'] }, fail); // "attrs->>'status'" — postgres answered
 */
export function chainHook<T, R>(options?: THookOptions): TChainHook<T, R> {
  checkHookOptions(options, whereOf('chainHook'));
  const [
    list,
    add,
  ] = handlerList<TChainHandler<T, R>, TChainHandler<T, R>>(
    options, true, namedLink,
  );
  return {
    add,
    get size() {
      return list.current[0].length;
    },
    run(value: T, end: (value: T) => R): R {
      return responsibilityChain(
        list.current[0], value, end,
      );
    },
  };
}
