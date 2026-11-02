import {
  orderPresets,
  presetSetup,
  type TPreset,
  type TPresetObject,
} from '../../src/hooks';

type THost = string[];

const preset = (name: string, requires?: string[]): TPresetObject<THost> => ({
  name,
  requires,
  setup: (host) => {
    host.push(name);
  },
});

const names = (presets: TPreset<THost>[]): string[] => presets.map((item) => (typeof item === 'function' ? 'fn' : item.name));

describe('orderPresets — each after those it requires (H10)', () => {
  test('a dependency moves up just before the one that requires it; the rest as listed', () => {
    const main = preset('presetMain', [
      'presetHints',
      'presetStandard',
    ]);
    const hints = preset('presetHints');
    const standard = preset('presetStandard');
    const other = preset('presetOther');
    expect(names(orderPresets([
      other,
      main,
      hints,
      standard,
    ]))).toEqual([
      'presetOther',
      'presetHints',
      'presetStandard',
      'presetMain',
    ]);
  });

  test('a chain of dependencies; a function preset stays in its place', () => {
    const fn = (host: THost): void => {
      host.push('fn');
    };
    expect(names(orderPresets([
      preset('c', ['b']),
      fn,
      preset('b', ['a']),
      preset('a'),
    ]))).toEqual([
      'a',
      'b',
      'c',
      'fn',
    ]);
  });

  test('the same object twice — once; the same function twice — once', () => {
    const a = preset('a');
    const fn = (): void => undefined;
    expect(names(orderPresets([
      a,
      fn,
      a,
      fn,
    ]))).toEqual([
      'a',
      'fn',
    ]);
  });

  test('a dependency connected by an earlier call counts; that object is not returned again', () => {
    const base = preset('base');
    const top = preset('top', ['base']);
    expect(names(orderPresets([top], {
      connected: {
        base,
      },
    }))).toEqual(['top']);
    expect(names(orderPresets([
      base,
      top,
    ], {
      connected: {
        base,
      },
    }))).toEqual(['top']);
  });

  test('every setup runs in the order given back', () => {
    const host: THost = [];
    for (const item of orderPresets<TPreset<THost>>([
      preset('b', ['a']),
      (h) => {
        h.push('fn');
      },
      preset('a'),
    ])) {
      presetSetup(item)(host);
    }
    expect(host).toEqual([
      'a',
      'b',
      'fn',
    ]);
  });

  test('an empty list: nothing', () => {
    expect(orderPresets([])).toEqual([]);
  });
});

describe('orderPresets — mistakes, all before any setup', () => {
  test.each<[string, unknown, string]>([
    [
      'not a list',
      {},
      '[documents] documentsProvider: expects a list of presets, got object',
    ],
    [
      'not a preset',
      [null],
      '[documents] documentsProvider: expects a preset — a function or { name, setup } — got null',
    ],
    [
      'no name',
      [
        {
          setup: () => undefined,
        },
      ],
      '[documents] documentsProvider: preset object: a preset object needs a "name"',
    ],
    [
      'no setup',
      [
        {
          name: 'a',
        },
      ],
      '[documents] documentsProvider: preset "a": a preset object needs a "setup(host)" function',
    ],
    [
      'requires not a list of names',
      [
        {
          name: 'a',
          requires: 'b',
          setup: () => undefined,
        },
      ],
      '[documents] documentsProvider: preset "a": "requires" expects a list of preset names, got string "b"',
    ],
    [
      'a requires not connected — the connected listed',
      [
        preset('presetLabRecords', ['presetFieldLines']),
        preset('presetOther'),
      ],
      '[documents] documentsProvider: presetLabRecords requires "presetFieldLines", which is not connected. Connected presets: presetLabRecords, presetOther',
    ],
    [
      'a cycle',
      [
        preset('presetA', ['presetB']),
        preset('presetB', ['presetA']),
      ],
      '[documents] documentsProvider: presets require each other: presetA → presetB → presetA',
    ],
    [
      'two objects, one name',
      [
        preset('x'),
        preset('x'),
      ],
      '[documents] documentsProvider: two different presets are named "x"',
    ],
  ])('%s', (
    _case, presets, message,
  ) => {
    expect(() => orderPresets(presets as never, {
      where: '[documents] documentsProvider',
    })).toThrow(message);
  });

  test('one name with a preset connected earlier; the default prefix', () => {
    expect(() => orderPresets([preset('x')], {
      connected: {
        x: preset('x'),
      },
    })).toThrow('[fundamentool/hooks] orderPresets: two different presets are named "x"');
  });

  test('a cycle through a longer path names only the cycle', () => {
    expect(() => orderPresets([
      preset('top', ['a']),
      preset('a', ['b']),
      preset('b', ['a']),
    ])).toThrow('presets require each other: a → b → a');
  });

  test('no setup ran when the order failed', () => {
    const host: THost = [];
    expect(() => {
      for (const item of orderPresets([
        preset('a'),
        preset('b', ['missing']),
      ])) {
        presetSetup(item)(host);
      }
    }).toThrow('b requires "missing"');
    expect(host).toEqual([]);
  });

  test('an unknown option (development)', () => {
    expect(() => orderPresets([], {
      conected: {},
    } as never)).toThrow('unknown option "conected". Did you mean "connected"?');
  });
});
