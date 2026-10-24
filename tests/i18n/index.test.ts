/**
 * Localization (fundamentool D-060 – D-066): a game with a kit's set and its own, in English, Russian and Arabic, the
 * German loaded on demand — what the player sees, what a developer's mistake gives in development and in production.
 */
import {
  compileMessages,
  createI18n,
  createLocale,
  createMessages,
  hashKeys,
  isRtl,
  sourceOf,
} from '../../src/i18n';
import type {
  TLexiconSource,
  TLocaleValues,
  TPlainKey,
} from '../../src/i18n';

const en = {
  hello: 'Hi, {{name}}!',
  menu: {
    play: 'Play',
    settings: 'Settings',
  },
  hud: {
    moves: '{{count|one:# move|other:# moves}}',
  },
  level: {
    title: 'Level {{id}} ({{id|number}} of {{total}})',
  },
  shop: {
    price: 'Only {{price|currency:USD}}',
    sale: '{{off|percent}} off',
    balance: 'You have {{coins|one:# coin|other:# coins}}',
  },
  chat: {
    sent: 'Sent {{at|clock}}',
    day: 'On {{at|date:short}}',
    ago: 'Seen {{at|relative}}',
    friends: 'With {{names|list}}',
  },
  tip: {
    hint: 'Tap <b>{{booster|t}}</b> to see the <i>next</i> step',
  },
  booster: {
    hint: {
      name: 'Hint',
    },
  },
  praise: [
    'Excellent!',
    'Wonderful!',
  ],
  broken: {
    format: 'Odd {{x|weird}}',
  },
} as const;

const ru = {
  hello: 'Привет, {{name}}!',
  menu: {
    play: 'Играть',
    settings: 'Настройки',
  },
  hud: {
    moves: '{{count|one:# ход|few:# хода|many:# ходов|other:# хода}}',
  },
  level: {
    title: 'Уровень {{id}} ({{id|number}} из {{total}})',
  },
  shop: {
    price: 'Всего {{price|currency:USD}}',
    sale: 'Скидка {{off|percent}}',
    balance: 'У вас {{coins|one:# монета|few:# монеты|many:# монет|other:# монеты}}',
  },
  chat: {
    sent: 'Отправлено {{at|clock}}',
    day: '{{at|date:short}}',
    ago: 'Был {{at|relative}}',
    friends: 'С {{names|list}}',
  },
  tip: {
    hint: 'Нажмите <b>{{booster|t}}</b>',
  },
  booster: {
    hint: {
      name: 'Подсказка',
    },
  },
  praise: ['Отлично!'],
  broken: {
    format: 'Странно {{x|weird}}',
  },
};

/** Arabic: one text translated, the rest falls back to English. */
const ar = {
  hello: 'مرحبا {{name}}',
  menu: {
    play: 'العب',
  },
  level: {
    title: 'المستوى {{id}} ({{id|number}} من {{total}})',
  },
};

const kitEn = {
  settings: {
    sound: 'Sounds',
  },
} as const;

const de = {
  menu: {
    play: 'Spielen',
    settings: 'Einstellungen',
  },
};

const LOCALES = [
  'en',
  'ru',
  'ar',
  'de',
] as const;

/** A source with `de` not in the bundle — fetched by `load`, which the test controls. */
function sourceWithDe(load?: (locale: string) => Promise<TLocaleValues>): TLexiconSource {
  const inline = sourceOf({
    kit: {
      en: kitEn,
      ru: {
        settings: {
          sound: 'Звуки',
        },
      },
    },
    game: {
      en,
      ru,
      ar,
    },
  }, 'en');
  const full = sourceOf({
    kit: {
      en: kitEn,
    },
    game: {
      en,
      de,
    },
  }, 'en');
  return {
    ...inline,
    load: load ?? (async () => ({
      hash: inline.hash,
      values: full.values.de,
    })),
  };
}

function setup(load?: (locale: string) => Promise<TLocaleValues>) {
  const locale = createLocale({
    source: sourceWithDe(load),
    locales: LOCALES,
  });
  const text = createMessages<typeof en, typeof LOCALES[number]>(locale, 'game');
  const kit = createMessages<typeof kitEn, typeof LOCALES[number]>(locale, 'kit');
  return {
    locale,
    text,
    kit,
    K: text.keys,
  };
}

const NOW = new Date(
  2026, 9, 24, 14, 2,
).getTime();

describe('the compact source', () => {
  it('the keys once, as the owner wrote them — a leaf its name, a group [name, children]; the values by position', () => {
    const source = sourceOf({
      game: {
        en: {
          menu: {
            play: 'Play',
            settings: 'Settings',
          },
          booster: {
            hint: {
              name: 'Hint',
            },
          },
        },
        ru: {
          menu: {
            play: 'Играть',
            settings: 'Настройки',
          },
          booster: {
            hint: {
              name: 'Подсказка',
            },
          },
        },
      },
    }, 'en');
    expect(source.keys).toEqual([
      [
        'game',
        [
          [
            'menu',
            [
              'play',
              'settings',
            ],
          ],
          [
            'booster',
            [
              [
                'hint',
                ['name'],
              ],
            ],
          ],
        ],
      ],
    ]);
    expect(source.values).toEqual({
      en: [
        'Play',
        'Settings',
        'Hint',
      ],
      ru: [
        'Играть',
        'Настройки',
        'Подсказка',
      ],
    });
    expect(source.hash).toBe(hashKeys(source.keys));
  });

  it('a text a translation lacks is null — its place kept; a set without the base locale has no keys', () => {
    const source = sourceOf({
      game: {
        en: {
          a: 'A',
          b: 'B',
        },
        ru: {
          b: 'Б',
        },
      },
      empty: {
        ru: {
          x: 'x',
        },
      },
    }, 'en');
    expect(source.values.ru).toEqual([
      null,
      'Б',
    ]);
    expect(source.keys[1]).toEqual([
      'empty',
      [],
    ]);
  });

  it('the hash follows the keys, not the texts', () => {
    const one = sourceOf({
      s: {
        en: {
          a: 'A',
        },
      },
    }, 'en');
    const other = sourceOf({
      s: {
        en: {
          a: 'Another text',
        },
      },
    }, 'en');
    const renamed = sourceOf({
      s: {
        en: {
          b: 'A',
        },
      },
    }, 'en');
    expect(one.hash).toBe(other.hash);
    expect(one.hash).not.toBe(renamed.hash);
  });
});

describe('messages: what the player reads', () => {
  it('plain texts, plurals by the locale, the plural\'s number formatted', async () => {
    const {
      locale, text, K,
    } = setup();
    expect(text.t(K.menu.play)).toBe('Play');
    expect(text.t(K.hud.moves, {
      count: 1,
    })).toBe('1 move');
    expect(text.t(K.shop.balance, {
      coins: 12345,
    })).toBe('You have 12,345 coins');
    await locale.select('ru');
    expect([
      1,
      3,
      5,
      21,
    ].map((count) => text.t(K.hud.moves, {
      count,
    }))).toEqual([
      '1 ход',
      '3 хода',
      '5 ходов',
      '21 ход',
    ]);
    expect(text.t(K.shop.balance, {
      coins: 12345,
    })).toBe('У вас 12 345 монет');
  });

  it('values converted where the message needs them (D-062): one value as text and as a number', () => {
    const {
      text, K,
    } = setup();
    expect(text.t(K.hud.moves, {
      count: '3',
    })).toBe('3 moves');
    expect(text.t(K.level.title, {
      id: '0012',
      total: 40,
    })).toBe('Level 0012 (12 of 40)');
    expect(text.t(K.shop.price, {
      price: '2.99',
    })).toBe('Only $2.99');
    expect(text.t(K.shop.sale, {
      off: 0.25,
    })).toBe('25% off');
  });

  it('dates: a Date, ms or an ISO string; the time today, the date and time another day; relative; lists', () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    try {
      const {
        text, K,
      } = setup();
      expect(text.t(K.chat.sent, {
        at: new Date(NOW - 60_000),
      })).toBe('Sent 02:01 PM');
      expect(text.t(K.chat.sent, {
        at: String(NOW - 86_400_000),
      })).toBe('Sent Oct 23, 02:02 PM');
      expect(text.t(K.chat.day, {
        at: '2026-10-24T10:00:00',
      })).toBe('On 10/24/26');
      expect(text.t(K.chat.ago, {
        at: NOW - 3 * 60_000,
      })).toBe('Seen 3 minutes ago');
      expect(text.t(K.chat.ago, {
        at: NOW,
      })).toBe('Seen now');
      expect(text.t(K.chat.friends, {
        names: [
          'Ann',
          'Bo',
          'Cy',
        ] as never,
      })).toBe('With Ann, Bo, and Cy');
      expect(text.t(K.chat.friends, {
        names: 'Ann',
      })).toBe('With Ann');
    } finally {
      jest.useRealTimers();
    }
  });

  it('a key passed as a value is translated (|t); tags come as parts, and t gives the text without them', async () => {
    const {
      locale, text, K,
    } = setup();
    expect(text.parts(K.tip.hint, {
      booster: K.booster.hint.name,
    })).toEqual([
      {
        text: 'Tap ',
      },
      {
        text: 'Hint',
        tag: 'b',
      },
      {
        text: ' to see the ',
      },
      {
        text: 'next',
        tag: 'i',
      },
      {
        text: ' step',
      },
    ]);
    expect(text.t(K.tip.hint, {
      booster: K.booster.hint.name,
    })).toBe('Tap Hint to see the next step');
    expect(text.parts(K.menu.play)).toEqual([
      {
        text: 'Play',
      },
    ]);
    await locale.select('ru');
    expect(text.t(K.tip.hint, {
      booster: K.booster.hint.name,
    })).toBe('Нажмите Подсказка');
  });

  it('a value holding a tag stays text — never markup', () => {
    const {
      text, K,
    } = setup();
    expect(text.parts(K.hello, {
      name: '<b>x</b>',
    })).toEqual([
      {
        text: 'Hi, <b>x</b>!',
      },
    ]);
  });

  it('lists in each language\'s length; has; the key constants', async () => {
    const {
      locale, text, K,
    } = setup();
    expect(text.list(K.praise)).toEqual([
      'Excellent!',
      'Wonderful!',
    ]);
    await locale.select('ru');
    expect(text.list(K.praise)).toEqual(['Отлично!']);
    expect(K.booster.hint.name).toBe('booster.hint.name');
    expect(text.has('menu.play')).toBe(true);
    expect(text.has('praise')).toBe(false);
    expect(text.has('menu.nope')).toBe(false);
  });

  it('right to left: values isolated (FSI…PDI) so a Latin id keeps its order; a text missing in Arabic — English', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const {
        locale, text, K,
      } = setup();
      await locale.select('ar');
      expect(text.t(K.hello, {
        name: 'Ann-7',
      })).toBe('مرحبا ⁨Ann-7⁩');
      expect(text.t(K.level.title, {
        id: '7',
        total: 40,
      })).toBe('المستوى ⁨7⁩ (⁨7⁩ من ⁨40⁩)');
      expect(text.t(K.menu.settings)).toBe('Settings');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('game: "ar" has no menu.settings'));
    } finally {
      warn.mockRestore();
    }
  });

  it('a t bound to a locale is one function — kept between calls (useT\'s identity)', () => {
    const {
      text, K,
    } = setup();
    const bound = text._bound('ru');
    expect(text._bound('ru')).toBe(bound);
    expect(bound(K.menu.play)).toBe('Играть');
    expect(text._text(
      'ru', K.tip.hint, {
        booster: K.booster.hint.name,
      }, true,
    )).toEqual([
      {
        text: 'Нажмите ',
      },
      {
        text: 'Подсказка',
        tag: 'b',
      },
    ]);
  });

  it('translate: another locale; one whose texts aren\'t there — the base', () => {
    const {
      text, kit, K,
    } = setup();
    expect(text.translate('ru', K.menu.play)).toBe('Играть');
    expect(text.translate('de', K.menu.play)).toBe('Play');
    expect(kit.translate('ru', kit.keys.settings.sound)).toBe('Звуки');
  });

  it('format.*: numbers, prices, dates and lists of the current locale', async () => {
    const {
      locale, text,
    } = setup();
    expect(text.format.number(1234.5)).toBe('1,234.5');
    expect(text.format.number('0.5', {
      style: 'percent',
    })).toBe('50%');
    expect(text.format.currency(2.99, 'EUR')).toBe('€2.99');
    expect(text.format.percent(0.1)).toBe('10%');
    expect(text.format.date(new Date(
      2026, 9, 24,
    ), 'long')).toBe('October 24, 2026');
    expect(text.format.date(new Date(
      2026, 9, 24,
    ))).toBe('Oct 24, 2026');
    expect(text.format.clock(NOW, NOW)).toBe('02:02 PM');
    expect(text.format.relative(NOW + 2 * 86_400_000, NOW)).toBe('in 2 days');
    expect(text.format.list([
      'a',
      2,
    ])).toBe('a and 2');
    await locale.select('ru');
    expect(text.format.number(1234.5)).toBe('1 234,5');
    expect(text.format.list([
      'а',
      'б',
    ])).toBe('а и б');
    expect(typeof text.format.clock(NOW)).toBe('string');
    expect(typeof text.format.relative(NOW)).toBe('string');
  });
});

describe('mistakes: an error in development, the value as it is in production (D-062)', () => {
  const cases: [string, (setupResult: ReturnType<typeof setup>) => string, string, string][] = [
    [
      'a variable not passed',
      ({
        text, K,
      }) => text.t(K.hud.moves, {} as never),
      '"count" isn\'t passed',
      '',
    ],
    [
      'a plural given a word',
      ({
        text, K,
      }) => text.t(K.hud.moves, {
        count: 'many',
      }),
      '"count" expects a number, got string "many"',
      'many',
    ],
    [
      'a plain variable given an object',
      ({
        text, K,
      }) => text.t(K.level.title, {
        id: {} as never,
        total: 1,
      }),
      '"id" expects a string or a number',
      'Level [object Object] ([object Object] of 1)',
    ],
    [
      'a number format given a word',
      ({
        text, K,
      }) => text.t(K.shop.price, {
        price: 'cheap',
      }),
      '"price" expects a number',
      'Only cheap',
    ],
    [
      'a date given a word',
      ({
        text, K,
      }) => text.t(K.chat.sent, {
        at: 'yesterday',
      }),
      '"at" expects a date',
      'Sent yesterday',
    ],
    [
      '|t given an unknown key',
      ({
        text, K,
      }) => text.t(K.tip.hint, {
        booster: 'booster.magent.name',
      }),
      '"booster" expects a key of the set',
      'Tap booster.magent.name to see the next step',
    ],
    [
      'an unknown format',
      ({
        text, K,
      }) => text.t(K.broken.format, {
        x: 1,
      }),
      'unknown format "|weird"',
      'Odd ',
    ],
    [
      'a plain variable not passed',
      ({
        text, K,
      }) => text.t(K.hello, {} as never),
      '"name" isn\'t passed',
      'Hi, !',
    ],
    [
      'a date given an object',
      ({
        text, K,
      }) => text.t(K.chat.day, {
        at: {} as never,
      }),
      '"at" expects a date',
      'On [object Object]',
    ],
    [
      'a list of an unknown key',
      ({
        text,
      }) => text.list('nope' as never).join(),
      '"nope" is not a list',
      'nope',
    ],
    [
      'a key not in the set',
      ({
        text,
      }) => text.t('menu.nope' as never),
      'no message "menu.nope"',
      'menu.nope',
    ],
    [
      'a list read as a text',
      ({
        text, K,
      }) => text.t(K.praise as never),
      '"praise" is a list',
      'praise',
    ],
    [
      'a text read as a list',
      ({
        text, K,
      }) => text.list(K.menu.play as never).join(),
      '"menu.play" is not a list',
      'menu.play',
    ],
    [
      'parts of an unknown key',
      ({
        text,
      }) => JSON.stringify(text.parts('x.y' as never)),
      'no message "x.y"',
      '[{"text":"x.y"}]',
    ],
    [
      'each missing in a list of dates and plurals',
      ({
        text, K,
      }) => text.t(K.chat.friends, {} as never) + text.t(K.chat.day, {} as never) + text.t(K.shop.sale, {} as never) +
      text.t(K.tip.hint, {} as never),
      'isn\'t passed',
      'With On  offTap  to see the next step',
    ],
  ];

  it.each(cases)('%s — development: an error naming it', (
    _, call, message,
  ) => {
    expect(() => call(setup())).toThrow(message);
  });

  it.each(cases)('%s — production: shown as it is, one warning', (
    _, call, message, shown,
  ) => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const context = setup();
      expect(call(context)).toBe(shown);
      call(context);
      const calls = warn.mock.calls.filter(([text]) => String(text).includes(message));
      expect(calls.length).toBeGreaterThan(0);
      expect(new Set(calls.map(([text]) => text)).size).toBe(calls.length);
    } finally {
      warn.mockRestore();
      process.env.NODE_ENV = env;
    }
  });
});

describe('the locale: switching, loading, detection', () => {
  it('starts in the base; a locale becomes current once its texts are there', async () => {
    let release!: () => void;
    const {
      locale, text, K,
    } = setup(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return sourceLoaded();
    });
    const seen: string[] = [];
    locale.$locale.watch((tag) => seen.push(tag));
    const choosing = locale.select('de');
    await Promise.resolve();
    expect(locale.$locale.getState()).toBe('en');
    release();
    expect(await choosing).toBe(true);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(text.t(K.menu.play)).toBe('Spielen');
      expect(text.t(K.hud.moves, {
        count: 2,
      })).toBe('2 moves');
      // the German fixture translates the menu only: the rest in English, said once in development
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('game: "de" has no hello, hud.moves'));
    } finally {
      warn.mockRestore();
    }
    expect(seen).toEqual([
      'en',
      'de',
    ]);
  });

  it('the last choice wins: an earlier load that finishes later doesn\'t switch', async () => {
    let release!: () => void;
    const {
      locale,
    } = setup(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return sourceLoaded();
    });
    const toGerman = locale.select('de');
    const toRussian = locale.select('ru');
    expect(await toRussian).toBe(true);
    release();
    expect(await toGerman).toBe(false);
    expect(locale.$locale.getState()).toBe('ru');
    await locale.ready();
  });

  it('a load in flight is shared; a loaded locale is ready at once; preload without switching', async () => {
    const load = jest.fn(async () => sourceLoaded());
    const {
      locale,
    } = setup(load);
    const [
      first,
      second,
    ] = await Promise.all([
      locale.load('de'),
      locale.load('de'),
    ]);
    expect([
      first,
      second,
    ]).toEqual([
      true,
      true,
    ]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(locale.$locale.getState()).toBe('en');
    expect(await locale.select('de')).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
    expect(await locale.select('ru')).toBe(true);
  });

  it('offline: the load fails — the current locale stays, the next try fetches again', async () => {
    let fail = true;
    const load = jest.fn(async () => {
      if (fail) {
        throw new Error('offline');
      }
      return sourceLoaded();
    });
    const {
      locale,
    } = setup(load);
    expect(await locale.select('de')).toBe(false);
    expect(locale.$locale.getState()).toBe('en');
    await locale.ready();
    fail = false;
    expect(await locale.select('de')).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a chunk of another build (another hash) is refused; without a loader a locale not inline can\'t come', async () => {
    const {
      locale,
    } = setup(async () => ({
      hash: 'old',
      values: [],
    }));
    expect(await locale.select('de')).toBe(false);
    const noLoader = createLocale({
      source: sourceOf({
        game: {
          en,
        },
      }, 'en'),
      locales: [
        'en',
        'fr',
      ],
    });
    expect(await noLoader.select('fr')).toBe(false);
    expect(await noLoader.load('en')).toBe(true);
  });

  it('select of something not a locale: an error in development, false in production', async () => {
    const {
      locale,
    } = setup();
    expect(() => locale.select('xx' as never)).toThrow('select: string "xx" is not one of en, ru, ar, de');
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(await locale.select('xx' as never)).toBe(false);
    } finally {
      process.env.NODE_ENV = env;
    }
  });

  it('detect: the first supported of saved / platform / browser; aliases, regions, Chinese by script', () => {
    const locale = createLocale({
      source: sourceOf({
        s: {
          en: {
            a: 'A',
          },
        },
      }, 'en'),
      locales: [
        'en',
        'pt-BR',
        'no',
        'zh-Hans',
        'zh-Hant',
        'de',
        'uk',
      ],
      aliases: {
        ua: 'uk',
      },
    });
    expect(locale.detect([
      undefined,
      null,
      '',
      'xx',
      'de-AT',
    ])).toBe('de');
    expect(locale.detect([
      'uk',
      'de',
    ])).toBe('uk');
    expect(locale.detect(['pt-PT'])).toBe('pt-BR');
    expect(locale.detect(['nb-NO'])).toBe('no');
    expect(locale.detect(['zh-TW'])).toBe('zh-Hant');
    expect(locale.detect(['zh-Hant-HK'])).toBe('zh-Hant');
    expect(locale.detect(['zh-Hans-HK'])).toBe('zh-Hans');
    expect(locale.detect(['zh'])).toBe('zh-Hans');
    expect(locale.detect(['PT-br'])).toBe('pt-BR');
    expect(locale.detect(['ua'])).toBe('uk');
    expect(locale.detect(['xx'])).toBe('en');
    expect(locale.isLocale('de')).toBe(true);
    expect(locale.isLocale('fr')).toBe(false);
    const noChinese = createLocale({
      source: sourceOf({
        s: {
          en: {
            a: 'A',
          },
        },
      }, 'en'),
      locales: ['en'],
    });
    expect(noChinese.detect(['zh-TW'])).toBe('en');
  });

  it('pick: the current locale\'s entry, else the base\'s, else a complaint', async () => {
    const {
      locale,
    } = setup();
    await locale.select('ru');
    expect(locale.pick({
      en: 'Forest',
      ru: 'Лес',
    })).toBe('Лес');
    expect(locale.pick({
      en: 'Forest',
    })).toBe('Forest');
    expect(() => locale.pick({
      de: 'Wald',
    })).toThrow('pick: no "ru" or "en"');
  });

  it('options checked in development: an unknown option, a base without texts', () => {
    expect(() => createLocale({
      source: sourceOf({
        s: {
          en: {
            a: 'A',
          },
        },
      }, 'en'),
      locales: ['en'],
      alias: {},
    } as never)).toThrow('unknown option "alias"');
    expect(() => createLocale({
      source: sourceOf({
        s: {
          en: {
            a: 'A',
          },
        },
      }, 'en'),
      locales: ['ru'],
    })).toThrow('the base locale "ru" has no texts');
    expect(() => createLocale({
      source: sourceOf({}, 'en'),
      locales: [],
    })).toThrow('the base locale "undefined" has no texts');
  });

  it('a set the source doesn\'t have', () => {
    const {
      locale,
    } = setup();
    expect(() => createMessages(locale, 'nope')).toThrow('no set "nope" in the source');
  });
});

describe('types of keys', () => {
  it('TPlainKey: a key without variables shows with t(key) alone; one needing variables isn\'t one', () => {
    const {
      text, K,
    } = setup();
    const title: TPlainKey<typeof en> = K.menu.play;
    expect(text.t(title)).toBe('Play');
    // @ts-expect-error — `hud.moves` needs `count`: not a plain key
    const moves: TPlainKey<typeof en> = K.hud.moves;
    expect(moves).toBe('hud.moves');
    // @ts-expect-error — a bare string isn't a key (D-066)
    text.t('menu.play');
  });
});

describe('createI18n — one set, one call', () => {
  it('the locale\'s members and the set\'s', async () => {
    const i18n = createI18n<typeof kitEn, 'en' | 'ru'>({
      source: sourceOf({
        app: {
          en: kitEn,
          ru: {
            settings: {
              sound: 'Звуки',
            },
          },
        },
      }, 'en'),
      locales: [
        'en',
        'ru',
      ],
    });
    expect(i18n.t(i18n.keys.settings.sound)).toBe('Sounds');
    expect(await i18n.select('ru')).toBe(true);
    expect(i18n.t(i18n.keys.settings.sound)).toBe('Звуки');
    expect(i18n.$locale.getState()).toBe('ru');
    expect(i18n.detect(['ru-RU'])).toBe('ru');
    expect(i18n.isLocale('en')).toBe(true);
    expect(i18n.pick({
      ru: 'да',
    })).toBe('да');
    await i18n.ready();
  });

  it('a source without sets', () => {
    expect(() => createI18n({
      source: {
        ...sourceOf({}, 'en'),
        values: {
          en: [],
        },
      },
      locales: ['en'],
    })).toThrow('no set "" in the source');
  });
});

describe('compileMessages, isRtl — on their own', () => {
  it('a flat map compiled once; |t within the map', () => {
    const messages = compileMessages({
      coins: '{{n|one:# coin|other:# coins}}',
      item: 'Gold',
      got: 'You got {{what|t}}',
    }, 'en');
    expect(messages.coins({
      n: 12345,
    })).toBe('12,345 coins');
    expect(messages.got({
      what: 'item',
    })).toBe('You got Gold');
  });

  it('|currency without a code — USD; |date without a style — medium', () => {
    const messages = compileMessages({
      price: '{{p|currency}}',
      day: '{{at|date}}',
    }, 'en');
    expect(messages.price({
      p: 3,
    })).toBe('$3.00');
    expect(messages.day({
      at: new Date(
        2026, 9, 24,
      ),
    })).toBe('Oct 24, 2026');
  });

  it('a plural without a form for the category and without other — empty', () => {
    expect(compileMessages({
      x: '{{n|one:one}}',
    }, 'en').x({
      n: 2,
    })).toBe('');
  });

  it('right-to-left languages', () => {
    expect([
      'ar-EG',
      'he',
      'fa',
      'ur',
      'en',
      'ru',
    ].map(isRtl)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});

/** German as `load` delivers it — the values in the order of `sourceWithDe`'s keys. */
function sourceLoaded(): TLocaleValues {
  const inline = sourceWithDe(async () => ({
    hash: '',
    values: [],
  }));
  const withDe = sourceOf({
    kit: {
      en: kitEn,
    },
    game: {
      en,
      de,
    },
  }, 'en');
  return {
    hash: inline.hash,
    values: withDe.values.de,
  };
}
