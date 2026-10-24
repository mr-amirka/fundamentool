/**
 * The Vite plugin (D-065) driven through its hooks over real folders: a game's set and a kit's set from a package, the
 * game rewording a kit text; English and Russian in the bundle, German on demand; a broken translation failing the
 * build.
 */
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {
  tmpdir,
} from 'node:os';
import path from 'node:path';
import {
  lexicons,
} from '../../src/i18n/vite';
import type {
  TLexiconsOptions,
} from '../../src/i18n/vite';

let root: string;

function write(file: string, content: string): void {
  mkdirSync(path.dirname(path.join(root, file)), {
    recursive: true,
  });
  writeFileSync(path.join(root, file), content);
}

beforeEach(() => {
  // the real path: macOS's temporary folder is a link (/var → /private/var), packages resolve to real paths
  root = realpathSync(mkdtempSync(path.join(tmpdir(), 'lexicons-')));
  write('app/src/i18n/en.ts', `import type { TMessages } from 'fundamentool/i18n';
export const en = {
  menu: { play: 'Play' },
  hud: { moves: '{{count|one:# move|other:# moves}}' },
} as const satisfies TMessages;
`);
  write('app/src/i18n/ru.ts', `import type { TTranslation } from 'fundamentool/i18n';
import type { en } from './en';
export const messages: TTranslation<typeof en> = {
  menu: { play: 'Играть' },
  hud: { moves: '{{count|one:# ход|few:# хода|many:# ходов|other:# хода}}' },
};
`);
  write('app/src/i18n/de.js', `export default {
  menu: { play: 'Spielen' },
  hud: { moves: '{{count|one:# Zug|other:# Züge}}' },
};
`);
  write('node_modules/@wg/components/i18n/en.ts', `export const en = { settings: { sound: 'Sounds', support: 'Support' } };
`);
  write('node_modules/@wg/components/i18n/ru.mts', `export let messages = { settings: { sound: 'Звуки', support: 'Поддержка' } };
`);
  write('node_modules/@wg/components/i18n/de.ts', `export var messages = { settings: { sound: 'Töne', support: 'Hilfe' } };
`);
  write('app/src/i18n/kit/en.ts', `export const messages = { settings: { support: 'Write to the puzzle team' } };
`);
});

afterEach(() => {
  rmSync(root, {
    recursive: true,
    force: true,
  });
});

const OPTIONS: TLexiconsOptions = {
  locales: [
    'en',
    'ru',
    'de',
  ],
  sets: {
    kit: {
      from: '@wg/components/i18n',
      override: './src/i18n/kit',
    },
    game: {
      from: './src/i18n',
    },
  },
  inline: ['ru'],
};

/** Runs the plugin's hooks as Vite does; returns its modules' code and the files it watches. */
async function run(options: TLexiconsOptions, ids: string[]): Promise<{ code: (string | undefined)[];
  watched: string[] }> {
  const plugin = lexicons(options);
  plugin.configResolved?.({
    root: path.join(root, 'app'),
  });
  const watched: string[] = [];
  const context = {
    addWatchFile: (file: string) => watched.push(file),
  };
  const code: (string | undefined)[] = [];
  for (const id of ids) {
    const resolved = plugin.resolveId?.(id);
    code.push(resolved ? await plugin.load?.call(context, resolved) : undefined);
  }
  return {
    code,
    watched,
  };
}

/** The JSON value after `name: ` in the generated module. */
function field(code: string, name: string): unknown {
  const match = new RegExp(`${name}: (.*),\\n`).exec(code);
  return JSON.parse((match as RegExpExecArray)[1]);
}

describe('lexicons — the compact source', () => {
  it('the keys once, the inline locales inside, the others as chunks with the same hash; the override applied', async () => {
    const {
      code: [
        main,
        german,
        unknownId,
      ],
      watched,
    } = await run(OPTIONS, [
      'virtual:lexicons',
      'virtual:lexicons/de',
      'other',
    ]);
    expect(field(main as string, 'keys')).toEqual([
      [
        'kit',
        [
          [
            'settings',
            [
              'sound',
              'support',
            ],
          ],
        ],
      ],
      [
        'game',
        [
          [
            'menu',
            ['play'],
          ],
          [
            'hud',
            ['moves'],
          ],
        ],
      ],
    ]);
    expect(field(main as string, 'values')).toEqual({
      en: [
        'Sounds',
        'Write to the puzzle team',
        'Play',
        '{{count|one:# move|other:# moves}}',
      ],
      ru: [
        'Звуки',
        'Поддержка',
        'Играть',
        '{{count|one:# ход|few:# хода|many:# ходов|other:# хода}}',
      ],
    });
    expect(main).toContain('"de": () => import("virtual:lexicons/de")');
    expect(main).not.toContain('"ru": () => import(');
    const hash = field(main as string, 'hash');
    expect(german).toBe(`export const chunk = { hash: ${JSON.stringify(hash)}, values: ${JSON.stringify([
      'Töne',
      'Hilfe',
      'Spielen',
      '{{count|one:# Zug|other:# Züge}}',
    ])} };\n`);
    expect(unknownId).toBeUndefined();
    const plugin = lexicons(OPTIONS);
    plugin.configResolved?.({
      root: path.join(root, 'app'),
    });
    const context = {
      addWatchFile: () => undefined,
    };
    expect(await plugin.load?.call(context, '/src/main.ts')).toBeUndefined();
    expect(await plugin.load?.call(context, '\0virtual:lexicons/xx')).toContain('values: []');
    // each virtual module watches the files it's built from
    expect([...new Set(watched.map((file) => path.relative(root, file)))].sort()).toEqual([
      'app/src/i18n/de.js',
      'app/src/i18n/en.ts',
      'app/src/i18n/kit/en.ts',
      'app/src/i18n/ru.ts',
      'node_modules/@wg/components/i18n/de.ts',
      'node_modules/@wg/components/i18n/en.ts',
      'node_modules/@wg/components/i18n/ru.mts',
    ]);
  });

  it('inline "all": no chunk to load; the default: the base only', async () => {
    const {
      code: [all],
    } = await run({
      ...OPTIONS,
      inline: 'all',
    }, ['virtual:lexicons']);
    expect(Object.keys(field(all as string, 'values') as object)).toEqual([
      'en',
      'ru',
      'de',
    ]);
    expect(all).toContain('const loaders = {};');
    const {
      code: [base],
    } = await run({
      ...OPTIONS,
      inline: undefined,
    }, ['virtual:lexicons']);
    expect(Object.keys(field(base as string, 'values') as object)).toEqual(['en']);
  });

  it('the generated loader: a known locale imports its chunk, an unknown one rejects', async () => {
    const {
      code: [main],
    } = await run(OPTIONS, ['virtual:lexicons']);
    const body = (main as string).replace(/import\("virtual:lexicons\/de"\)/, 'Promise.resolve({ chunk: "de" })')
      .replace('export const source =', 'return');
    const source = new Function(body)() as { load(locale: string): Promise<unknown> };
    await expect(source.load('de')).resolves.toBe('de');
    await expect(source.load('xx')).rejects.toThrow('no locale xx');
  });

  it('a change of a watched file rebuilds on the next load; another file doesn\'t', async () => {
    const plugin = lexicons(OPTIONS);
    plugin.configResolved?.({
      root: path.join(root, 'app'),
    });
    const context = {
      addWatchFile: () => undefined,
    };
    const first = await plugin.load?.call(context, '\0virtual:lexicons');
    write('app/src/i18n/en.ts', `export const en = { menu: { play: 'Start' }, hud: { moves: '{{count|one:# move|other:# moves}}' } };
`);
    plugin.handleHotUpdate?.({
      file: path.join(root, 'elsewhere.ts'),
    });
    expect(await plugin.load?.call(context, '\0virtual:lexicons')).toBe(first);
    plugin.handleHotUpdate?.({
      file: path.join(root, 'app/src/i18n/en.ts'),
    });
    expect(await plugin.load?.call(context, '\0virtual:lexicons')).toContain('"Start"');
  });
});

describe('lexicons — what fails the build', () => {
  it('a translation unlike its base: every problem listed', async () => {
    write('app/src/i18n/de.js', `export default { menu: {}, hud: { moves: 'viele Züge' }, extra: 'x' };
`);
    await expect(run(OPTIONS, ['virtual:lexicons'])).rejects.toThrow('the translations differ from their base — 3 problem(s):\n  game/de: menu.play: missing\n' +
      '  game/de: hud.moves: variables (none) ≠ count\n  game/de: extra: not in the base');
  });

  it('a locale without its file; a set without its base file', async () => {
    rmSync(path.join(root, 'app/src/i18n/de.js'));
    await expect(run(OPTIONS, ['virtual:lexicons'])).rejects.toThrow('game/de: no file de.ts in');
    rmSync(path.join(root, 'app/src/i18n/en.ts'));
    await expect(run(OPTIONS, ['virtual:lexicons'])).rejects.toThrow('set "game" has no base file en.ts');
  });

  it('an override adding a key the set doesn\'t have — at any depth', async () => {
    write('app/src/i18n/kit/en.ts', `export const messages = { settings: { volume: 'Volume' } };
`);
    await expect(run(OPTIONS, ['virtual:lexicons'])).rejects.toThrow('kit override en.settings.volume is not in the set it rewords');
  });

  it('a messages file importing a value, or exporting no object', async () => {
    write('app/src/i18n/ru.ts', `import { other } from './other';
export const messages = other;
`);
    await expect(run(OPTIONS, ['virtual:lexicons'])).rejects.toThrow('ru.ts imports values — a messages file holds data only');
    write('app/src/i18n/ru.ts', `export const count = 3;
`);
    await expect(run(OPTIONS, ['virtual:lexicons'])).rejects.toThrow('ru.ts exports no object of messages');
  });

  it('a package that isn\'t installed', async () => {
    await expect(run({
      ...OPTIONS,
      sets: {
        kit: {
          from: 'no-such-kit/i18n',
        },
      },
    }, ['virtual:lexicons'])).rejects.toThrow('package "no-such-kit" not found above');
  });

  it('options: no locales, no sets, an inline locale not in the list', () => {
    expect(() => lexicons({
      ...OPTIONS,
      locales: [],
    })).toThrow('`locales` is empty');
    expect(() => lexicons({
      ...OPTIONS,
      sets: {},
    })).toThrow('`sets` is empty');
    expect(() => lexicons({
      ...OPTIONS,
      inline: [
        'fr',
        'ru',
      ],
    })).toThrow('`inline` has fr — not in `locales` (en, ru, de)');
  });

  it('a Node without stripTypeScriptTypes (before 22.13 / 24)', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('node:module', () => ({}));
      const {
        lexicons: isolated,
      } = await import('../../src/i18n/vite');
      const plugin = isolated(OPTIONS);
      plugin.configResolved?.({
        root: path.join(root, 'app'),
      });
      await expect(plugin.load?.call({
        addWatchFile: () => undefined,
      }, '\0virtual:lexicons')).rejects.toThrow('Node 24+ is needed to read');
    });
  });

  it('without configResolved — the current folder is the root', async () => {
    const plugin = lexicons({
      ...OPTIONS,
      sets: {
        game: {
          from: path.join(root, 'app/src/i18n'),
        },
      },
    });
    expect(await plugin.load?.call({
      addWatchFile: () => undefined,
    }, '\0virtual:lexicons')).toContain('"Play"');
  });
});
