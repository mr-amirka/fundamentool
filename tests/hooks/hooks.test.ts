import {
  bailHook,
  chainHook,
  eachHook,
  hookError,
  waterfallHook,
} from '../../src/hooks';

type TChange = {
  id: string;
  accepted?: string;
};

describe('eachHook — everyone is told (H1)', () => {
  test('every handler is called with the value, in the order added', () => {
    const hook = eachHook<string>();
    const log: string[] = [];
    hook.add((value) => log.push(`a ${value}`));
    hook.add((value) => log.push(`b ${value}`));
    hook.run('x');
    expect(log).toEqual([
      'a x',
      'b x',
    ]);
    expect(hook.size).toBe(2);
  });

  test('no handlers: nothing happens (H12)', () => {
    const hook = eachHook<number>();
    expect(hook.size).toBe(0);
    expect(hook.run(1)).toBeUndefined();
  });
});

describe('waterfallHook — each changes the value in turn (H2)', () => {
  test('the next handler sees the change; undefined keeps the value', () => {
    const hook = waterfallHook<TChange>({
      name: '[documents] beforeWrite',
    });
    const seen: TChange[] = [];
    hook.add((change) => (change.accepted ? undefined : {
      ...change,
      accepted: '2026-10-31',
    }));
    hook.add((change) => {
      seen.push(change);
      return undefined;
    });
    expect(hook.run({
      id: 'D-1',
    })).toEqual({
      id: 'D-1',
      accepted: '2026-10-31',
    });
    expect(seen).toEqual([
      {
        id: 'D-1',
        accepted: '2026-10-31',
      },
    ]);
  });

  test('no handlers: the value itself', () => {
    const value = {
      id: 'x',
    };
    expect(waterfallHook<TChange>().run(value)).toBe(value);
  });
});

describe('bailHook — the first that knows answers (H3)', () => {
  test('the first answer that is not undefined; the rest are not asked', () => {
    const hook = bailHook<string, number>();
    const asked: string[] = [];
    hook.add((step) => {
      asked.push('earlier');
      return step === 'decision' ? 1 : undefined;
    });
    hook.add((step) => {
      asked.push('later');
      return step === 'decision' ? 2 : undefined;
    });
    expect(hook.run('decision')).toBe(2);
    expect(asked).toEqual(['later']);
  });

  test('nobody knew: undefined', () => {
    const hook = bailHook<string, number>();
    hook.add(() => undefined);
    expect(hook.run('x')).toBeUndefined();
    expect(bailHook<string, number>().run('x')).toBeUndefined();
  });

  test('a falsy answer is an answer', () => {
    const hook = bailHook<string, number>();
    hook.add(() => 5);
    hook.add(() => 0);
    expect(hook.run('x')).toBe(0);
  });
});

describe('chainHook — a handler wraps the rest (H4, H5)', () => {
  test('before, next, after; the latest added is outermost', () => {
    const hook = chainHook<number, string>();
    const log: string[] = [];
    hook.add((value, next) => {
      log.push('inner before');
      const result = next(value + 1);
      log.push('inner after');
      return result;
    });
    hook.add((value, next) => `[${next(value * 10)}]`);
    expect(hook.run(1, (value) => {
      log.push(`end ${value}`);
      return String(value);
    })).toBe('[11]');
    expect(log).toEqual([
      'inner before',
      'end 11',
      'inner after',
    ]);
  });

  test('a later preset replaces a handler and reaches it through next — the SQL dialect over the ANSI form', () => {
    type TNode = {
      of: string;
      path: string[];
    };
    const hook = chainHook<TNode, string>({
      name: '[fundamentool/sql] node "json-get"',
    });
    hook.add((n) => `json_extract(${n.of}, '$.${n.path.join('.')}')`, {
      by: 'sqlite',
    });
    hook.add((n, next) => (n.path.length === 1 ? `${n.of}->>'${n.path[0]}'` : next()), {
      by: 'postgres',
    });
    const fail = (): string => {
      throw new Error('no handler');
    };
    expect(hook.run({
      of: 'attrs',
      path: ['status'],
    }, fail)).toBe('attrs->>\'status\'');
    expect(hook.run({
      of: 'attrs',
      path: [
        'a',
        'b',
      ],
    }, fail)).toBe('json_extract(attrs, \'$.a.b\')');
  });

  test('a handler answering without next: end is not called', () => {
    const hook = chainHook<number, number>();
    hook.add(() => 7);
    const end = jest.fn((value: number) => value);
    expect(hook.run(1, end)).toBe(7);
    expect(end).not.toHaveBeenCalled();
  });

  test('no handlers: end(value)', () => {
    expect(chainHook<number, number>().run(3, (value) => value * 2)).toBe(6);
  });
});

describe('the order — a later handler has the last word; pre and post (H7)', () => {
  const ADDED: [string, 'pre' | 'post' | undefined][] = [
    [
      'A',
      undefined,
    ],
    [
      'B',
      'post',
    ],
    [
      'C',
      undefined,
    ],
    [
      'D',
      'pre',
    ],
  ];

  test('each and waterfall: pre; the rest earliest first; post — D, A, C, B', () => {
    const each = eachHook<string[]>();
    const waterfall = waterfallHook<string>();
    for (const [
      name,
      order,
    ] of ADDED) {
      each.add((log) => {
        log.push(name);
      }, {
        order,
      });
      waterfall.add((log) => log + name, {
        order,
      });
    }
    const log: string[] = [];
    each.run(log);
    expect(log.join('')).toBe('DACB');
    expect(waterfall.run('')).toBe('DACB');
  });

  test('bail and chain: pre; the rest latest first; post — D, C, A, B', () => {
    const bail = bailHook<string[], number>();
    const chain = chainHook<string, string>();
    for (const [
      name,
      order,
    ] of ADDED) {
      bail.add((log) => {
        log.push(name);
        return undefined;
      }, {
        order,
      });
      chain.add((log, next) => next(log + name), {
        order,
      });
    }
    const log: string[] = [];
    bail.run(log);
    expect(log.join('')).toBe('DCAB');
    expect(chain.run('', (value) => value)).toBe('DCAB');
  });
});

describe('removal (H8)', () => {
  test('the removal removes; twice is harmless', () => {
    const hook = eachHook<string[]>();
    const off = hook.add((log) => {
      log.push('a');
    });
    hook.add((log) => {
      log.push('b');
    });
    off();
    off();
    const log: string[] = [];
    hook.run(log);
    expect(log).toEqual(['b']);
    expect(hook.size).toBe(1);
  });

  test('a handler removing itself, or adding another, does not change the run in progress', () => {
    const hook = eachHook<string[]>();
    const off = hook.add((log) => {
      log.push('a');
      off();
      hook.add((later) => {
        later.push('added');
      });
    });
    hook.add((log) => {
      log.push('b');
    });
    const first: string[] = [];
    hook.run(first);
    expect(first).toEqual([
      'a',
      'b',
    ]);
    const second: string[] = [];
    hook.run(second);
    expect(second).toEqual([
      'b',
      'added',
    ]);
  });

  test('the same handler added twice is two handlers, each removed by its own removal', () => {
    const hook = eachHook<string[]>();
    const handler = (log: string[]): void => {
      log.push('x');
    };
    const off = hook.add(handler);
    hook.add(handler);
    off();
    const log: string[] = [];
    hook.run(log);
    expect(log).toEqual(['x']);
  });
});

describe('errors — named, never swallowed (H9)', () => {
  const BROKEN = new Error('Cannot read properties of undefined (reading \'attrs\')');
  const broken = (): never => {
    throw BROKEN;
  };

  test.each([
    [
      'each',
      () => {
        const hook = eachHook<number>({
          name: '[documents] afterWrite',
        });
        hook.add(() => undefined);
        hook.add(broken, {
          by: 'presetLabRecords',
        });
        hook.run(1);
      },
      '[documents] afterWrite: the handler of presetLabRecords threw: Cannot read properties of undefined (reading \'attrs\')',
    ],
    [
      'waterfall',
      () => {
        const hook = waterfallHook<number>({
          name: '[documents] beforeWrite',
        });
        hook.add(broken, {
          by: 'presetLabRecords',
        });
        hook.run(1);
      },
      '[documents] beforeWrite: the handler of presetLabRecords threw: Cannot read properties of undefined (reading \'attrs\')',
    ],
    [
      'bail',
      () => {
        const hook = bailHook<number, number>();
        hook.add(broken);
        hook.run(1);
      },
      'hook: a handler threw: Cannot read properties of undefined (reading \'attrs\')',
    ],
    [
      'chain',
      () => {
        const hook = chainHook<number, number>({
          name: '[sql] node',
        });
        hook.add(broken, {
          by: 'sqlite',
        });
        hook.run(1, (value) => value);
      },
      '[sql] node: the handler of sqlite threw: Cannot read properties of undefined (reading \'attrs\')',
    ],
  ])('%s: the hook, who added it, the cause', (
    _kind, run, message,
  ) => {
    let caught: unknown;
    try {
      run();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(message);
    expect((caught as Error).cause).toBe(BROKEN);
  });

  test('the handlers after the one that threw are not run', () => {
    const hook = eachHook<string[]>();
    hook.add(broken);
    const after = jest.fn();
    hook.add(after);
    expect(() => hook.run([])).toThrow('a handler threw');
    expect(after).not.toHaveBeenCalled();
  });

  test('chain: an inner handler\'s error passes through the outer ones unchanged — named once', () => {
    const hook = chainHook<number, number>({
      name: '[sql] node',
    });
    hook.add(broken, {
      by: 'sqlite',
    });
    hook.add((value, next) => next(value), {
      by: 'postgres',
    });
    expect(() => hook.run(1, (value) => value)).toThrow(/^\[sql\] node: the handler of sqlite threw/);
  });

  test('chain: an error of end passes through unchanged; an outer handler\'s own error is its own', () => {
    const hook = chainHook<number, number>();
    hook.add((value, next) => next(value), {
      by: 'a',
    });
    expect(() => hook.run(1, broken)).toThrow(BROKEN);
    hook.add((value, next) => {
      try {
        return next(value);
      } catch {
        throw new Error('replaced');
      }
    }, {
      by: 'b',
    });
    expect(() => hook.run(1, broken)).toThrow('hook: the handler of b threw: replaced');
  });

  test('hookError: a thrown non-Error is shown as text', () => {
    expect(hookError(
      'h', undefined, 'plain',
    ).message).toBe('h: a handler threw: plain');
  });
});

describe('options — checked in development (lab D-023)', () => {
  test('an unknown hook option, with the nearest one', () => {
    expect(() => eachHook({
      nam: 'x',
    } as never)).toThrow('[fundamentool/hooks] eachHook: unknown option "nam". Did you mean "name"?');
  });

  test('add: a handler that is not a function; an unknown order; an unknown option', () => {
    const hook = waterfallHook<number>({
      name: '[documents] beforeWrite',
    });
    expect(() => hook.add('x' as never)).toThrow('[documents] beforeWrite add: the handler');
    expect(() => hook.add(() => 1, {
      order: 'first' as never,
    })).toThrow('[documents] beforeWrite add');
    expect(() => hook.add(() => 1, {
      bye: 'x',
    } as never)).toThrow('Did you mean "by"?');
    expect(hook.size).toBe(0);
  });
});

describe('size — a host may skip the work (H12)', () => {
  test.each([
    [
      'each',
      eachHook<number>,
    ],
    [
      'waterfall',
      waterfallHook<number>,
    ],
    [
      'bail',
      bailHook<number, number>,
    ],
    [
      'chain',
      chainHook<number, number>,
    ],
  ])('%s: 0, then the number of handlers, then less after a removal', (_kind, make) => {
    const hook = make();
    expect(hook.size).toBe(0);
    const off = (hook.add as (handler: () => undefined) => () => void)(() => undefined);
    (hook.add as (handler: () => undefined) => () => void)(() => undefined);
    expect(hook.size).toBe(2);
    off();
    expect(hook.size).toBe(1);
  });
});
