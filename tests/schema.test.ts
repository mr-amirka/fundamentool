/**
 * `fundamentool/schema` (D-051): every combinator, every message — the lab's form "<where>: <path> expects …, got …",
 * an unknown key with "did you mean", labels naming a part — and the type each schema gives (`TInfer`).
 */
import {
  array,
  boolean,
  custom,
  func,
  literal,
  number,
  object,
  oneOf,
  record,
  string,
  tuple,
  union,
  unknown,
} from '../src/schema';
import type {
  TInfer,
} from '../src/schema';

const WHERE = '[test] create';

/** The message `parse` throws for `value` (or `null` — it fits). */
function messageOf(schema: { parse(value: unknown, where: string): unknown }, value: unknown): string | null {
  try {
    schema.parse(value, WHERE);
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

describe('schema', () => {
  it('the kinds of one value', () => {
    expect(messageOf(string(), 'x')).toBeNull();
    expect(messageOf(string(), 5)).toBe(`${WHERE}: expects a string, got number 5`);
    expect(messageOf(boolean(), 1)).toBe(`${WHERE}: expects true or false, got number 1`);
    expect(messageOf(func(), {})).toBe(`${WHERE}: expects a function, got object`);
    expect(messageOf(func(), () => 1)).toBeNull();
    expect(messageOf(unknown(), Symbol.iterator)).toBeNull();
    expect(messageOf(number(), NaN)).toBe(`${WHERE}: expects a number, got number NaN`);
    expect(messageOf(number().min(0), -1)).toBe(`${WHERE}: expects a number ≥ 0, got number -1`);
    expect(messageOf(number().int().min(0), 1.5)).toBe(`${WHERE}: expects a whole number ≥ 0, got number 1.5`);
    expect(messageOf(number().min(0).int(), 3)).toBeNull();
    expect(messageOf(number().positive(), 0)).toBe(`${WHERE}: expects a number > 0, got number 0`);
    expect(messageOf(number().finite().positive(), Infinity)).toBe(`${WHERE}: expects a finite number > 0, got number Infinity`);
    expect(messageOf(number().finite().positive(), 2)).toBeNull();
    expect(messageOf(literal('page'), 'window')).toBe(`${WHERE}: expects string "page", got string "window"`);
    expect(messageOf(literal(2), 2)).toBeNull();
    expect(messageOf(custom((value) => value instanceof Date, 'a date'), 'today')).toBe(`${WHERE}: expects a date, got string "today"`);
    expect(messageOf(union([
      string(),
      number(),
    ]), true)).toBe(`${WHERE}: expects a string or a number, got boolean true`);
    expect(messageOf(union([
      string(),
      number(),
    ]), 4)).toBeNull();
  });

  it('oneOf: a list or a function giving it; a near string — "did you mean"', () => {
    let gates = [
      'onboarding',
      'signIn',
    ];
    const gate = oneOf(() => gates);
    expect(messageOf(gate, 'onbording')).toBe(`${WHERE}: expects one of onboarding, signIn, got string "onbording". Did you mean "onboarding"?`);
    expect(messageOf(gate, 5)).toBe(`${WHERE}: expects one of onboarding, signIn, got number 5`);
    gates = [];
    expect(messageOf(gate, 'x')).toBe(`${WHERE}: expects one of none, got string "x"`);
    expect(messageOf(oneOf(['a']), 'a')).toBeNull();
  });

  it('objects: the path in quotes, an unknown key with "did you mean" (or the known ones), undefined as absent; passthrough; keys', () => {
    const options = object({
      keep: number().min(0).optional(),
      fallback: object({
        path: string(),
      }).optional(),
    });
    expect(options.keys).toEqual([
      'keep',
      'fallback',
    ]);
    expect(messageOf(options, null)).toBe(`${WHERE}: expects an options object, got null`);
    expect(messageOf(options, [])).toBe(`${WHERE}: expects an options object, got array`);
    expect(messageOf(options, {
      kep: 1,
    })).toBe(`${WHERE}: unknown option "kep". Did you mean "keep"?`);
    expect(messageOf(options, {
      zzz: 1,
    })).toBe(`${WHERE}: unknown option "zzz". Known options: keep, fallback`);
    expect(messageOf(options, {
      zzz: undefined,
    })).toBeNull();
    expect(messageOf(options, {
      keep: -1,
    })).toBe(`${WHERE}: "keep" expects a number ≥ 0, got number -1`);
    expect(messageOf(options, {
      fallback: {
        path: 1,
      },
    })).toBe(`${WHERE}: "fallback"."path" expects a string, got number 1`);
    expect(messageOf(options, {
      fallback: {
        pth: '/',
      },
    })).toBe(`${WHERE}: "fallback": unknown option "pth". Did you mean "path"?`);
    const open = object({
      main: unknown(),
    }).passthrough();
    expect(messageOf(open, {
      main: 1,
      level: 3,
    })).toBeNull();
    expect(open.keys).toEqual(['main']);
  });

  it('lists, places and records: an index, a label naming the part (from it on the path starts anew)', () => {
    const ROW = object({
      keep: boolean().optional(),
    }).passthrough();
    const routes = array(tuple([
      string(),
      ROW,
    ]).label((row) => `the row "${row[0]}"`));
    expect(messageOf(routes, 'x')).toBe(`${WHERE}: expects a list, got string "x"`);
    expect(messageOf(routes, [
      [
        '/x',
        {
          keep: true,
          level: 3,
        },
      ],
    ])).toBeNull();
    expect(messageOf(routes, [
      [
        '/x',
        {
          keep: 1,
        },
      ],
    ])).toBe(`${WHERE}: the row "/x": "keep" expects true or false, got number 1`);
    expect(messageOf(routes, [
      [
        5,
        {},
      ],
    ])).toBe(`${WHERE}: the row "5": [0] expects a string, got number 5`);
    expect(messageOf(routes, [5])).toBe(`${WHERE}: the row "undefined": expects a list of 2, got number 5`);
    expect(messageOf(array(string()), [
      'a',
      2,
    ])).toBe(`${WHERE}: [1] expects a string, got number 2`);
    expect(messageOf(tuple([string()]), [
      'a',
      'b',
    ])).toBe(`${WHERE}: expects a list of 1, got array`);
    const unnamed = array(string().label(() => {
      throw new Error('cannot name');
    }));
    expect(messageOf(unnamed, [1])).toBe(`${WHERE}: [0] expects a string, got number 1`); // a label that throws — the path as it is
    const gates = record(object({
      to: string(),
    }).label((_gate, name) => `the gate "${name}"`));
    expect(messageOf(gates, 5)).toBe(`${WHERE}: expects an object, got number 5`);
    expect(messageOf(gates, {
      a: {
        to: 1,
      },
    })).toBe(`${WHERE}: the gate "a": "to" expects a string, got number 1`);
    expect(messageOf(gates, {
      a: {
        too: '/',
      },
    })).toBe(`${WHERE}: the gate "a": unknown option "too". Did you mean "to"?`);
    expect(messageOf(gates, {
      a: {
        to: '/a',
      },
    })).toBeNull();
  });

  it('optional, refine, describe — and an object schema keeps its keys through them', () => {
    const host = object({
      routes: array(unknown()).describe('the route table ([pattern, row][])'),
      render: func().optional(),
    }).refine((options) => options.render !== undefined || options.routes.length > 0, 'an empty table needs a "render"')
      .describe('the host options')
      .label(() => 'the host');
    expect(host.keys).toEqual([
      'routes',
      'render',
    ]);
    expect(host.passthrough().keys).toEqual([
      'routes',
      'render',
    ]);
    expect(messageOf(host, {
      routes: 'x',
    })).toBe(`${WHERE}: the host: "routes" expects the route table ([pattern, row][]), got string "x"`);
    expect(messageOf(host, {
      routes: [],
    })).toBe(`${WHERE}: the host: an empty table needs a "render"`);
    expect(messageOf(host, 7)).toBe(`${WHERE}: the host: expects the host options, got number 7`);
    expect(messageOf(string().optional(), undefined)).toBeNull();
    expect(messageOf(string().refine((text) => text.startsWith('/'), 'a path starts with "/"'), 'x')).toBe(`${WHERE}: a path starts with "/"`);
  });

  it('safeParse doesn\'t throw; parse returns the value', () => {
    const flag = boolean();
    expect(flag.safeParse(true)).toEqual({
      success: true,
      data: true,
    });
    const failed = flag.safeParse(1);
    expect(failed.success).toBe(false);
    expect((failed as { error: TypeError }).error.message).toBe('expects true or false, got number 1');
    expect(flag.parse(false, WHERE)).toBe(false);
  });

  it('TInfer: the type from the schema — optional keys optional, a passthrough object open', () => {
    const GATE = object({
      closed: custom<{ getState(): boolean }>((value) => !!value, 'a store'),
      to: object({
        path: string(),
      }),
      keep: number().optional(),
    });
    type TGate = TInfer<typeof GATE>;
    const gate: TGate = {
      closed: {
        getState: () => true,
      },
      to: {
        path: '/onboarding',
      },
    }; // `keep` may be left out
    const row: TInfer<ReturnType<ReturnType<typeof object<{ main: ReturnType<typeof unknown> }>>['passthrough']>> = {
      main: 1,
      level: 3,
    };
    expect(GATE.parse(gate, WHERE)).toBe(gate);
    expect(row.level).toBe(3);
  });
});
