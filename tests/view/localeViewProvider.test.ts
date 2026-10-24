/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * The locale's view bindings (D-061): a counter of moves re-renders when — and only when — the player switches the
 * language; a part of the screen in another language (a story, a test); a message with a link inside it; a message
 * passed down as data.
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act,
} from 'react';
import {
  createRoot,
} from 'react-dom/client';
import {
  createLocale,
  createMessages,
  sourceOf,
} from '../../src/i18n';
import type {
  TLexiconSource,
  TLocaleValues,
} from '../../src/i18n';
import {
  localeViewProvider,
} from '../../src/view';

const en = {
  hud: {
    moves: '{{count|one:# move|other:# moves}}',
  },
  legal: {
    accept: 'By playing you accept the <link>terms</link> and <b>rules</b>',
  },
  toast: {
    saved: 'Saved',
  },
} as const;
const ru = {
  hud: {
    moves: '{{count|one:# ход|few:# хода|many:# ходов|other:# хода}}',
  },
  legal: {
    accept: 'Играя, вы принимаете <link>условия</link> и <b>правила</b>',
  },
  toast: {
    saved: 'Сохранено',
  },
};
const de = {
  hud: {
    moves: '{{count|one:# Zug|other:# Züge}}',
  },
  legal: {
    accept: 'Mit dem Spiel akzeptierst du die <link>Bedingungen</link> und <b>Regeln</b>',
  },
  toast: {
    saved: 'Gespeichert',
  },
};

const LOCALES = [
  'en',
  'ru',
  'de',
] as const;

/** English and Russian in the bundle, German fetched — `release()` lets it arrive. */
function setup() {
  const inline = sourceOf({
    game: {
      en,
      ru,
    },
  }, 'en');
  const german = sourceOf({
    game: {
      en,
      de,
    },
  }, 'en');
  let release!: () => void;
  const arrived = new Promise<void>((resolve) => {
    release = resolve;
  });
  const source: TLexiconSource = {
    ...inline,
    load: async (): Promise<TLocaleValues> => {
      await arrived;
      return {
        hash: inline.hash,
        values: german.values.de,
      };
    },
  };
  const locale = createLocale({
    source,
    locales: LOCALES,
  });
  const text = createMessages<typeof en, typeof LOCALES[number]>(locale, 'game');
  return {
    locale,
    text,
    K: text.keys,
    release,
    ...localeViewProvider(React),
  };
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(element: React.ReactElement): Promise<void> {
  await act(async () => {
    root.render(element);
  });
}

describe('useT', () => {
  it('re-renders on a locale switch, and only then; keeps the same t until the locale changes', async () => {
    const {
      locale, text, K, useT,
    } = setup();
    const renders: string[] = [];
    const seen = new Set<unknown>();
    function Moves(props: { count: number }) {
      const t = useT(text);
      seen.add(t);
      const shown = t(K.hud.moves, {
        count: props.count,
      });
      renders.push(shown);
      return React.createElement(
        'span', null, shown,
      );
    }
    await render(React.createElement(Moves, {
      count: 3,
    }));
    expect(container.textContent).toBe('3 moves');
    await render(React.createElement(Moves, {
      count: 3,
    }));
    expect(seen.size).toBe(1);
    await act(async () => {
      await locale.select('ru');
    });
    expect(container.textContent).toBe('3 хода');
    expect(seen.size).toBe(2);
    const before = renders.length;
    await act(async () => {
      await locale.select('ru');
    });
    expect(renders.length).toBe(before);
  });
});

describe('LocaleProvider — a part of the screen in another locale', () => {
  it('the wrapped part in Russian, the rest in the app\'s English; the app\'s locale untouched', async () => {
    const {
      locale, text, K, useT, useLocale, LocaleProvider,
    } = setup();
    function Saved() {
      const t = useT(text);
      return React.createElement(
        'i', null, `${useLocale(locale)}:${t(K.toast.saved)}`,
      );
    }
    await render(React.createElement(
      'div', null, React.createElement(Saved), React.createElement(
        LocaleProvider, {
          locale: 'ru',
        }, React.createElement(Saved),
      ),
    ));
    expect(container.textContent).toBe('en:Savedru:Сохранено');
    expect(locale.$locale.getState()).toBe('en');
  });

  it('a locale not loaded yet: the base\'s texts, then the locale\'s when they arrive', async () => {
    const {
      text, K, useT, LocaleProvider, release,
    } = setup();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    function Saved() {
      return React.createElement(
        'i', null, useT(text)(K.toast.saved),
      );
    }
    try {
      await render(React.createElement(
        LocaleProvider, {
          locale: 'de',
        }, React.createElement(Saved),
      ));
      expect(container.textContent).toBe('Saved');
      await act(async () => {
        release();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(container.textContent).toBe('Gespeichert');
    } finally {
      warn.mockRestore();
    }
  });

  it('a locale that fails to load stays in the base\'s texts', async () => {
    const {
      locale, text, K, useT, LocaleProvider,
    } = setup();
    const failing = createLocale({
      source: {
        ...sourceOf({
          game: {
            en,
          },
        }, 'en'),
        load: async () => {
          throw new Error('offline');
        },
      },
      locales: LOCALES,
    });
    const failingText = createMessages<typeof en, typeof LOCALES[number]>(failing, 'game');
    function Saved() {
      return React.createElement(
        'i', null, useT(failingText)(K.toast.saved),
      );
    }
    await render(React.createElement(
      LocaleProvider, {
        locale: 'ru',
      }, React.createElement(Saved),
    ));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.textContent).toBe('Saved');
    expect(locale.$locale.getState()).toBe('en');
    expect(text.locale).toBe(locale);
  });
});

describe('<Text>', () => {
  it('tags rendered by the app — a link, a bold word; a tag without a renderer shows its text', async () => {
    const {
      locale, text, K, Text,
    } = setup();
    await render(React.createElement(Text, {
      of: text,
      k: K.legal.accept,
      tags: {
        link: (children: string) => React.createElement(
          'a', {
            href: '/terms',
            key: 'link',
          }, children,
        ),
      },
    }));
    expect(container.innerHTML).toBe('<span>By playing you accept the <a href="/terms">terms</a> and rules</span>');
    await act(async () => {
      await locale.select('ru');
    });
    expect(container.innerHTML).toBe('<span>Играя, вы принимаете <a href="/terms">условия</a> и правила</span>');
  });

  it('a message passed as data — a key and its variables (D-064)', async () => {
    const {
      text, K, Text,
    } = setup();
    await render(React.createElement(Text, {
      of: text,
      message: [
        K.hud.moves,
        {
          count: 1,
        },
      ],
    }));
    expect(container.textContent).toBe('1 move');
  });
});

describe('localeViewProvider — its deps', () => {
  it('a view library missing a function it needs — an error naming it', () => {
    expect(() => localeViewProvider({
      ...React,
      useState: undefined,
    } as never)).toThrow('"useState" expects the view library\'s function');
  });
});
