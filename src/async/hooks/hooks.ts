// The kinds of hook whose handlers may wait (fundamentool D-091, lab D-046, D-050): the sync module's four kinds by the
// same names, and `parallelHook`. A handler may return a value or a promise; every one is awaited alike. The list of
// handlers, their order and their errors are `fundamentool/hooks`' own core, not a copy.
import {
  NOTHING_PASSED,
  asIs,
  handlerList,
  hookError,
} from '../../hooks/list';
import {
  checkHookOptions,
} from '../../hooks/options';
import type {
  THookOptions,
} from '../../hooks/types';
import {
  responsibilityChain,
} from '../../responsibilityChain';
import type {
  TAwaitable,
  TBailHandler,
  TBailHook,
  TChainHandler,
  TChainHook,
  TEachHandler,
  TEachHook,
  TParallelHook,
  TWaterfallHandler,
  TWaterfallHook,
} from './types';

export {
  hookError,
} from '../../hooks/list';

/** The prefix of the module's option errors. */
const WHERE = '[fundamentool/async/hooks]';

/**
 * A chain's handler kept so its own throw or rejection is named, and an error coming out of `next` — another
 * handler's, already named, or `end`'s — passes through it unchanged.
 */
function namedLink<T, R>(
  handler: TChainHandler<T, R>, by: string | undefined, name: string,
): TChainHandler<T, R> {
  return async (value, next) => {
    let passed: unknown = NOTHING_PASSED;
    const onward = async (changed?: T): Promise<R> => {
      try {
        return await next(changed);
      } catch (error) {
        passed = error;
        throw error;
      }
    };
    try {
      return await handler(value, onward);
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
 * A hook every handler of which is told and none answers — `afterWrite`. Handlers run in the order added (`pre` first,
 * `post` last), each after the previous one settled; a handler that doesn't wait is fine.
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add(handler, { order, by })` → its removal, `run(value)` → a promise, `size`.
 * @throws {Error} as `run`'s rejection: a handler's throw or rejection, named — `[documents] afterWrite: the handler of
 * presetX threw: …`; the handlers after it don't run.
 * @example
 * const afterWrite = eachHook<TChange>({ name: '[documents] afterWrite' });
 * afterWrite.add(async (change) => { await search.update(change); }, { by: 'presetSearch' });
 * afterWrite.add((change) => { log.push(change.id); });
 * await afterWrite.run(change);
 */
export function eachHook<T>(options?: THookOptions): TEachHook<T> {
  checkHookOptions(options, `${WHERE} eachHook`);
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
    async run(value: T): Promise<void> {
      const current = list.current;
      const handlers = current[0];
      const length = handlers.length;
      let i = 0;
      try {
        for (; i < length; i++) {
          await handlers[i](value);
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
 * A hook every handler of which is started at once — `afterWrite` telling a search index, a log and a mirror, none
 * waiting for another. They start in running order; `run` settles when every one of them did, so none is cut short and
 * no failure is dropped.
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add`, `run(value)` → a promise, `size`.
 * @throws {Error} as `run`'s rejection, after all settled: one failure named; several — an `AggregateError` of the
 * named errors in running order (`[documents] afterWrite: 2 handlers threw`).
 * @example
 * const afterWrite = parallelHook<TChange>({ name: '[documents] afterWrite' });
 * afterWrite.add((change) => search.update(change), { by: 'presetSearch' });
 * afterWrite.add((change) => mirror.push(change), { by: 'presetMirror' });
 * await afterWrite.run(change); // both started at once; resolves when both are done
 */
export function parallelHook<T>(options?: THookOptions): TParallelHook<T> {
  checkHookOptions(options, `${WHERE} parallelHook`);
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
    async run(value: T): Promise<void> {
      const current = list.current;
      const handlers = current[0];
      const bys = current[1];
      const length = handlers.length;
      const started: Promise<void>[] = [];
      for (let i = 0; i < length; i++) {
        const handler = handlers[i];
        started.push(new Promise<void>((resolve) => {
          resolve(handler(value));
        }));
      }
      const settled = await Promise.allSettled(started);
      const errors: Error[] = [];
      for (let i = 0; i < length; i++) {
        const outcome = settled[i];
        if (outcome.status === 'rejected') {
          errors.push(hookError(
            list.name, bys[i], outcome.reason,
          ));
        }
      }
      if (errors.length === 1) {
        throw errors[0];
      }
      if (errors.length) {
        throw new AggregateError(errors, `${list.name}: ${errors.length} handlers threw`);
      }
    },
  };
}

/**
 * A hook whose handlers change a value in turn — `beforeWrite`: each gets what the previous one resolved to, and
 * `undefined` keeps the value. Handlers run in the order added, so a later preset sees what the earlier ones did.
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add`, `run(value)` → a promise of the value the last handler left, `size`.
 * @throws {Error} as `run`'s rejection: a handler's throw or rejection, named.
 * @example
 * const beforeWrite = waterfallHook<TChange>({ name: '[documents] beforeWrite' });
 * beforeWrite.add(async (change) => (await linkExists(change.link) ? undefined : { ...change, link: undefined }));
 * beforeWrite.add((change) => (change.accepted ? undefined : { ...change, accepted: now() }));
 * await beforeWrite.run(change); // the change, its dead link dropped, with `accepted`
 */
export function waterfallHook<T>(options?: THookOptions): TWaterfallHook<T> {
  checkHookOptions(options, `${WHERE} waterfallHook`);
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
    async run(value: T): Promise<T> {
      const current = list.current;
      const handlers = current[0];
      const length = handlers.length;
      let result = value;
      let changed: T | undefined;
      let i = 0;
      try {
        for (; i < length; i++) {
          changed = await handlers[i](result);
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
 * A hook answered by the first handler that knows — `resolve(step)`: a handler resolves to its answer, or to
 * `undefined` to let the next one answer. The latest added is asked first; the next is asked only after the previous
 * one resolved `undefined`.
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add`, `run(value)` → a promise of the first answer, or of `undefined` — nobody knew; `size`.
 * @throws {Error} as `run`'s rejection: a handler's throw or rejection, named.
 * @example
 * const resolve = bailHook<TStep, TNode[]>({ name: '[documents] resolve' });
 * resolve.add(async (step) => (step.kind === 'decision' ? store.decisions(step.id) : undefined), { by: 'presetLabRecords' });
 * await resolve.run({ kind: 'decision', id: 'D-042' }); // presetLabRecords' answer
 * await resolve.run({ kind: 'unknown' });               // undefined
 */
export function bailHook<T, R>(options?: THookOptions): TBailHook<T, R> {
  checkHookOptions(options, `${WHERE} bailHook`);
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
    async run(value: T): Promise<R | undefined> {
      const current = list.current;
      const handlers = current[0];
      const length = handlers.length;
      let answer: R | undefined;
      let i = 0;
      try {
        for (; i < length; i++) {
          answer = await handlers[i](value);
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
 * A hook whose handlers wrap the rest — middleware, as Koa's and Mongoose's: a handler does something, awaits `next`
 * to reach the handlers after it (`next()` — with the same value), and does something with their answer; or answers
 * without calling `next`. The latest added is outermost, so a later preset wraps an earlier one.
 *
 * @param options - `name`: the hook's name in its errors.
 * @returns The hook: `add`, `run(value, end)` → a promise of the outermost handler's answer (of `end(value)` when there
 * is none), `size`.
 * @throws {Error} as `run`'s rejection: a handler's throw or rejection, named once, where it happened.
 * @example
 * const write = chainHook<TChange, TWritten>({ name: '[documents] write' });
 * write.add(async (change, next) => { const written = await next(); await audit(written); return written; });
 * await write.run(change, (c) => store.write(c));
 */
export function chainHook<T, R>(options?: THookOptions): TChainHook<T, R> {
  checkHookOptions(options, `${WHERE} chainHook`);
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
    async run(value: T, end: (value: T) => TAwaitable<R>): Promise<R> {
      return responsibilityChain(
        list.current[0], value, async (last: T) => end(last),
      );
    },
  };
}
