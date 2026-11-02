import * as asyncHooks from '../../../src/async/hooks';
import {
  bailHook,
  chainHook,
  eachHook,
  hookMap,
  namedHooks,
  parallelHook,
  waterfallHook,
} from '../../../src/async/hooks';
import * as syncHooks from '../../../src/hooks';

type TChange = {
  id: string;
  accepted?: string;
};

/** What a promise rejected with. */
const rejection = (promise: Promise<unknown>): Promise<any> => promise.then(() => {
  throw new Error('expected a rejection');
},
(error: unknown) => error);

/** Resolves after the current macrotask, so a handler really waits. */
const later = <T>(value: T): Promise<T> => new Promise((resolve) => {
  setTimeout(() => resolve(value), 0);
});

describe('eachHook — in series (H1)', () => {
  test('each handler starts after the previous one settled; a sync handler is fine', async () => {
    const hook = eachHook<string>({
      name: '[documents] afterWrite',
    });
    const log: string[] = [];
    hook.add(async (value) => {
      log.push(`a start ${value}`);
      await later(null);
      log.push(`a end ${value}`);
    });
    hook.add((value) => {
      log.push(`b ${value}`);
    });
    const done = hook.run('x');
    expect(log).toEqual(['a start x']);
    await expect(done).resolves.toBeUndefined();
    expect(log).toEqual([
      'a start x',
      'a end x',
      'b x',
    ]);
    expect(hook.size).toBe(2);
  });

  test('no handlers: a resolved promise (H12)', async () => {
    const hook = eachHook<number>();
    const done = hook.run(1);
    expect(done).toBeInstanceOf(Promise);
    await expect(done).resolves.toBeUndefined();
  });

  test('a rejection stops the run and is named; the handlers after it are not called (H9)', async () => {
    const hook = eachHook<string>({
      name: '[documents] afterWrite',
    });
    const after = jest.fn();
    hook.add(() => later(null).then(() => {
      throw new Error('disk full');
    }), {
      by: 'presetSearch',
    });
    hook.add(after);
    const cause = await rejection(hook.run('x'));
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toBe('[documents] afterWrite: the handler of presetSearch threw: disk full');
    expect(((cause as Error).cause as Error).message).toBe('disk full');
    expect(after).not.toHaveBeenCalled();
  });

  test('a synchronous throw rejects the same way', async () => {
    const hook = eachHook<string>();
    hook.add(() => {
      throw new Error('oops');
    });
    await expect(hook.run('x')).rejects.toThrow('hook: a handler threw: oops');
  });
});

describe('parallelHook — every handler at once', () => {
  test('every handler starts at once, in running order; run waits for all', async () => {
    const hook = parallelHook<string>();
    const log: string[] = [];
    hook.add(async () => {
      log.push('a start');
      await later(null);
      log.push('a end');
    });
    hook.add(async () => {
      log.push('b start');
      await later(null);
      log.push('b end');
    });
    hook.add(async () => {
      log.push('c start');
    }, {
      order: 'pre',
    });
    const done = hook.run('x');
    expect(log).toEqual([
      'c start',
      'a start',
      'b start',
    ]);
    await done;
    expect(log.slice(3).sort()).toEqual([
      'a end',
      'b end',
    ]);
  });

  test('one failure: run waits for the rest, then rejects with the named error', async () => {
    const hook = parallelHook<string>({
      name: '[documents] afterWrite',
    });
    let slowDone = false;
    hook.add(() => Promise.reject(new Error('fast')), {
      by: 'presetA',
    });
    hook.add(async () => {
      await later(null);
      slowDone = true;
    });
    await expect(hook.run('x')).rejects.toThrow('[documents] afterWrite: the handler of presetA threw: fast');
    expect(slowDone).toBe(true);
  });

  test('several failures: an AggregateError of the named errors, in running order — none dropped', async () => {
    const hook = parallelHook<string>({
      name: '[documents] afterWrite',
    });
    hook.add(async () => {
      await later(null);
      throw new Error('first in order, last in time');
    }, {
      by: 'presetA',
    });
    hook.add(() => {
      throw new Error('sync');
    }, {
      by: 'presetB',
    });
    const error = await rejection(hook.run('x'));
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.message).toBe('[documents] afterWrite: 2 handlers threw');
    expect(error.errors.map((each: Error) => each.message)).toEqual([
      '[documents] afterWrite: the handler of presetA threw: first in order, last in time',
      '[documents] afterWrite: the handler of presetB threw: sync',
    ]);
  });

  test('no handlers: resolves', async () => {
    await expect(parallelHook().run(1)).resolves.toBeUndefined();
  });
});

describe('waterfallHook — each changes the value in turn (H2)', () => {
  test('the next handler sees the awaited change; undefined keeps the value', async () => {
    const hook = waterfallHook<TChange>({
      name: '[documents] beforeWrite',
    });
    const seen: TChange[] = [];
    hook.add(async (change) => {
      seen.push(change);
      return later({
        ...change,
        accepted: '2026-11-01 14:00',
      });
    });
    hook.add((change) => {
      seen.push(change);
      return undefined;
    });
    hook.add(async (change) => {
      seen.push(change);
      return undefined;
    });
    const result = await hook.run({
      id: 'D-048',
    });
    expect(result).toEqual({
      id: 'D-048',
      accepted: '2026-11-01 14:00',
    });
    expect(seen[1]).toBe(result);
    expect(seen[2]).toBe(result);
  });

  test('no handlers: the value itself', async () => {
    const value = {
      id: 'x',
    };
    await expect(waterfallHook<TChange>().run(value)).resolves.toBe(value);
  });

  test('a rejection is named by who added the handler', async () => {
    const hook = waterfallHook<TChange>({
      name: '[documents] beforeWrite',
    });
    hook.add(async () => {
      throw new Error('no such link');
    }, {
      by: 'presetLinks',
    });
    await expect(hook.run({
      id: 'x',
    })).rejects.toThrow('[documents] beforeWrite: the handler of presetLinks threw: no such link');
  });
});

describe('bailHook — the first answer (H3)', () => {
  test('the latest added is asked first; the next only after the previous resolved undefined', async () => {
    const hook = bailHook<string, string>();
    const log: string[] = [];
    hook.add(async (step) => {
      log.push('early');
      return `early ${step}`;
    });
    hook.add(async (step) => {
      log.push('late');
      await later(null);
      return step === 'mine' ? 'late mine' : undefined;
    });
    await expect(hook.run('mine')).resolves.toBe('late mine');
    expect(log).toEqual(['late']);
    await expect(hook.run('other')).resolves.toBe('early other');
    expect(log).toEqual([
      'late',
      'late',
      'early',
    ]);
  });

  test('nobody knew: undefined', async () => {
    const hook = bailHook<string, number>();
    hook.add(() => undefined);
    await expect(hook.run('x')).resolves.toBeUndefined();
  });

  test('a rejection is named', async () => {
    const hook = bailHook<string, number>({
      name: '[documents] resolve',
    });
    hook.add(() => Promise.reject(new Error('store gone')), {
      by: 'presetLabRecords',
    });
    await expect(hook.run('x')).rejects.toThrow('[documents] resolve: the handler of presetLabRecords threw: store gone');
  });
});

describe('chainHook — middleware (H4)', () => {
  test('a handler awaits next and works with the answer; the latest added is outermost', async () => {
    const hook = chainHook<number, string>({
      name: '[documents] write',
    });
    const log: string[] = [];
    hook.add(async (value, next) => {
      log.push('inner before');
      const answer = await next(value + 1);
      log.push('inner after');
      return `${answer}!`;
    });
    hook.add(async (_value, next) => {
      log.push('outer before');
      const answer = await next();
      log.push('outer after');
      return `[${answer}]`;
    });
    await expect(hook.run(1, async (value) => later(`end ${value}`))).resolves.toBe('[end 2!]');
    expect(log).toEqual([
      'outer before',
      'inner before',
      'inner after',
      'outer after',
    ]);
  });

  test('a handler answers without next: the rest and end are not reached', async () => {
    const hook = chainHook<number, string>();
    const end = jest.fn(() => 'end');
    hook.add(() => 'inner');
    hook.add((value, next) => (value > 0 ? 'cached' : next()));
    await expect(hook.run(1, end)).resolves.toBe('cached');
    await expect(hook.run(0, end)).resolves.toBe('inner');
    expect(end).not.toHaveBeenCalled();
  });

  test('no handlers: end, sync or async, as a promise', async () => {
    const hook = chainHook<number, number>();
    await expect(hook.run(2, (value) => value * 2)).resolves.toBe(4);
    await expect(hook.run(2, async (value) => value * 3)).resolves.toBe(6);
  });

  test('an inner rejection is named once, where it happened; the outer handlers pass it through', async () => {
    const hook = chainHook<number, string>({
      name: '[documents] write',
    });
    hook.add(async () => {
      await later(null);
      throw new Error('constraint');
    }, {
      by: 'presetInner',
    });
    hook.add(async (_value, next) => next(), {
      by: 'presetOuter',
    });
    const error = await rejection(hook.run(1, () => 'end'));
    expect(error.message).toBe('[documents] write: the handler of presetInner threw: constraint');
    expect((error.cause as Error).message).toBe('constraint');
  });

  test("end's rejection reaches the caller unchanged", async () => {
    const hook = chainHook<number, string>();
    const failure = new Error('store failed');
    hook.add((_value, next) => next());
    await expect(hook.run(1, () => Promise.reject(failure))).rejects.toBe(failure);
  });

  test("an outer handler's own failure after next is named by it", async () => {
    const hook = chainHook<number, string>({
      name: '[documents] write',
    });
    hook.add(async (_value, next) => {
      await next();
      throw new Error('audit failed');
    }, {
      by: 'presetAudit',
    });
    await expect(hook.run(1, () => 'ok')).rejects.toThrow('[documents] write: the handler of presetAudit threw: audit failed');
  });

  test('a handler that catches the rejection from next can recover', async () => {
    const hook = chainHook<number, string>();
    hook.add(async () => {
      throw new Error('inner');
    });
    hook.add(async (_value, next) => next().catch(() => 'recovered'));
    await expect(hook.run(1, () => 'end')).resolves.toBe('recovered');
  });
});

describe("the sync module's rules hold — its core is shared, not copied", () => {
  test('size counts the handlers of every kind', () => {
    const hooks = [
      eachHook<number>(),
      parallelHook<number>(),
      waterfallHook<number>(),
      bailHook<number, number>(),
      chainHook<number, number>(),
    ];
    hooks.forEach((hook) => {
      expect(hook.size).toBe(0);
      const off = hook.add((() => undefined) as never);
      expect(hook.size).toBe(1);
      off();
      expect(hook.size).toBe(0);
    });
  });

  test('order: pre / post and "a later handler has the last word" (the timeline of the card § 4.1)', async () => {
    const each: string[] = [];
    const eachH = eachHook<null>();
    const chain: string[] = [];
    const chainH = chainHook<null, null>();
    const names = [
      'A',
      'B',
      'C',
      'D',
    ];
    const orders: ('pre' | 'post' | undefined)[] = [
      undefined,
      'post',
      undefined,
      'pre',
    ];
    names.forEach((name, i) => {
      eachH.add(() => {
        each.push(name);
      }, {
        order: orders[i],
      });
      chainH.add((_value, next) => {
        chain.push(name);
        return next();
      }, {
        order: orders[i],
      });
    });
    await eachH.run(null);
    await chainH.run(null, () => null);
    expect(each.join(', ')).toBe('D, A, C, B');
    expect(chain.join(', ')).toBe('D, C, A, B');
  });

  test('a run keeps the handlers it started with; removal works mid-run and twice', async () => {
    const hook = eachHook<null>();
    const log: string[] = [];
    let off: () => void = () => undefined;
    hook.add(async () => {
      log.push('a');
      off();
      hook.add(() => {
        log.push('added mid-run');
      });
      await later(null);
    });
    off = hook.add(() => {
      log.push('b');
    });
    await hook.run(null);
    expect(log).toEqual([
      'a',
      'b',
    ]);
    off();
    await hook.run(null);
    expect(log).toEqual([
      'a',
      'b',
      'a',
      'added mid-run',
    ]);
  });

  test('hookMap and namedHooks take async hooks unchanged', async () => {
    const byKind = hookMap((kind: string) => waterfallHook<string>({
      name: `[documents] parse ${kind}`,
    }));
    byKind.for('decision').add(async (text) => text.toUpperCase());
    await expect(byKind.for('decision').run('d-048')).resolves.toBe('D-048');
    const host = namedHooks({
      beforeWrite: waterfallHook<number>(),
    }, '[documents]');
    host.add(
      'beforeWrite', async (value) => value + 1, {
        by: 'presetX',
      },
    );
    expect(host.names()).toEqual(['beforeWrite']);
  });
});

describe('a handler may return a value or a promise — the hook treats both alike', () => {
  test('waterfall, bail and chain mix sync and async handlers in one run', async () => {
    const waterfall = waterfallHook<number>();
    waterfall.add((value) => value + 1);
    waterfall.add(async (value) => later(value * 10));
    waterfall.add((value) => value + 2);
    await expect(waterfall.run(1)).resolves.toBe(22);

    const bail = bailHook<number, string>();
    bail.add((value) => (value > 5 ? 'big' : undefined));
    bail.add(async (value) => (value < 0 ? later('negative') : undefined));
    await expect(bail.run(-1)).resolves.toBe('negative');
    await expect(bail.run(9)).resolves.toBe('big');

    const chain = chainHook<number, string>();
    chain.add((value, next) => next(value + 1));
    chain.add(async (value, next) => `<${await next(value * 2)}>`);
    await expect(chain.run(1, (value) => String(value))).resolves.toBe('<3>');
  });
});

describe('options are checked in development (lab D-023)', () => {
  test('an unknown option, with the nearest one, named by this module', () => {
    expect(() => eachHook({
      nmae: 'x',
    } as never)).toThrow(/\[fundamentool\/async\/hooks\] eachHook[\s\S]*nmae[\s\S]*name/);
  });

  test('a name must be a string', () => {
    expect(() => parallelHook({
      name: 1,
    } as never)).toThrow(TypeError);
  });

  test('parallel is a kind of its own, not an option of eachHook', () => {
    expect(() => eachHook({
      parallel: true,
    } as never)).toThrow(/parallel/);
  });

  test("add's handler must be a function", () => {
    expect(() => bailHook().add('x' as never)).toThrow(TypeError);
  });
});

describe('one module per mode, one core (lab D-050)', () => {
  test("the tools that don't depend on the mode are the sync module's own, re-exported — not copies", () => {
    expect(asyncHooks.hookMap).toBe(syncHooks.hookMap);
    expect(asyncHooks.namedHooks).toBe(syncHooks.namedHooks);
    expect(asyncHooks.orderPresets).toBe(syncHooks.orderPresets);
    expect(asyncHooks.presetSetup).toBe(syncHooks.presetSetup);
    expect(asyncHooks.hookError).toBe(syncHooks.hookError);
  });

  test('the kinds are the same names, each module its own', () => {
    expect(Object.keys(asyncHooks).filter((name) => name.endsWith('Hook')).sort()).toEqual([
      'bailHook',
      'chainHook',
      'eachHook',
      'parallelHook',
      'waterfallHook',
    ]);
    expect(Object.keys(syncHooks).filter((name) => name.endsWith('Hook')).sort()).toEqual([
      'bailHook',
      'chainHook',
      'eachHook',
      'waterfallHook',
    ]);
    expect(asyncHooks.chainHook).not.toBe(syncHooks.chainHook);
  });
});
