/**
 * The checks of a set's translations (research 03 §5.15): what a package's test catches before a player does.
 */
import {
  checkSet,
  localeProblems,
} from '../../src/i18n/testing';

const en = {
  menu: {
    play: 'Play',
  },
  hud: {
    moves: '{{count|one:# move|other:# moves}}',
  },
  praise: [
    'Excellent!',
    'Wonderful!',
  ],
} as const;

describe('localeProblems', () => {
  it('a full translation has none — a list may have its own length', () => {
    expect(localeProblems(
      en, {
        menu: {
          play: 'Играть',
        },
        hud: {
          moves: '{{count|one:# ход|few:# хода|many:# ходов|other:# хода}}',
        },
        praise: ['Отлично!'],
      }, 'ru',
    )).toEqual([]);
  });

  it('every kind of problem, named by locale and path', () => {
    expect(localeProblems(
      en, {
        hud: {
          moves: '{{cont|one:# ход}}',
        },
        praise: 'Отлично!',
        extra: 'x',
      } as never, 'ru',
    )).toEqual([
      'ru: menu.play: missing',
      'ru: hud.moves: variables cont ≠ count',
      'ru: hud.moves: a plural without "other"',
      'ru: praise: a list expected',
      'ru: extra: not in the base',
    ]);
    expect(localeProblems(
      {
        a: 'A',
        b: 'Hi {{name}}',
      }, {
        a: ['x'],
        b: '  ',
      } as never, 'de',
    )).toEqual([
      'de: a: a text expected',
      'de: b: variables (none) ≠ name',
      'de: b: empty text',
    ]);
    expect(localeProblems(
      {
        list: ['x'],
      }, {
        list: [],
      }, 'de',
    )).toEqual(['de: list: an empty list']);
  });
});

describe('checkSet', () => {
  it('passes a complete set', () => {
    expect(() => checkSet({
      en,
      ru: {
        menu: {
          play: 'Играть',
        },
        hud: {
          moves: '{{count|one:# ход|other:# хода}}',
        },
        praise: ['Отлично!'],
      },
    })).not.toThrow();
  });

  it('throws one error listing every problem — the base\'s own included', () => {
    expect(() => checkSet({
      en: {
        a: '',
        b: '{{n|one:#}}',
      },
      ru: {
        a: 'А',
      },
    })).toThrow('checkSet: 3 problem(s)\n  en: a: empty text\n  en: b: a plural without "other"\n  ru: b: missing');
  });
});
