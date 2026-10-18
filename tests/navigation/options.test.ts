import {
  NAVIGATION_OPTION_KEYS,
  NAVIGATION_VIEW_OPTION_KEYS,
  createBrowserHistory,
  createNavigation,
  createNavigationView,
} from '../../src/navigation';
import type {
  TNavigationOptions,
  TNavigationViewOptions,
  TViewKit,
} from '../../src/navigation';
import {
  fakeHistory,
} from './_fakeHistory';

const valid = (): TNavigationOptions => ({
  history: fakeHistory('/a').port,
  describe: () => ({}), 
});

describe('createNavigation options', () => {
  it.each<[string, unknown, RegExp]>([
    [
      'not an object',
      null,
      /expects an options object, got null/,
    ],
    [
      'an array',
      [],
      /expects an options object, got array/,
    ],
    [
      'a typo',
      {
        ...valid(),
        descibe: 1, 
      },
      /unknown option "descibe"\. Did you mean "describe"\?/,
    ],
    [
      'no history',
      {
        describe: () => ({}), 
      },
      /option "history" expects a history port \{ state, path, push, replace, go, listen \}/,
    ],
    [
      'a history without go',
      {
        ...valid(),
        history: {
          ...fakeHistory().port,
          go: 1, 
        }, 
      },
      /option "history" expects/,
    ],
    [
      'no describe',
      {
        history: fakeHistory().port, 
      },
      /option "describe" expects a function/,
    ],
    [
      'sections not an object',
      {
        ...valid(),
        sections: '/a', 
      },
      /option "sections" expects an object section → main page path/,
    ],
    [
      'sections as an array',
      {
        ...valid(),
        sections: ['/a'], 
      },
      /option "sections" expects/,
    ],
    [
      'a section path not a string',
      {
        ...valid(),
        sections: {
          a: 1, 
        }, 
      },
      /option "sections" expects/,
    ],
    [
      'keep negative',
      {
        ...valid(),
        keep: -1, 
      },
      /option "keep" expects a number ≥ 0, got number -1/,
    ],
    [
      'exitMs not a number',
      {
        ...valid(),
        exitMs: '300', 
      },
      /option "exitMs" expects a number ≥ 0, got string "300"/,
    ],
    [
      'schedule not a function',
      {
        ...valid(),
        schedule: 1, 
      },
      /option "schedule" expects a function/,
    ],
    [
      'sectionHistory unknown',
      {
        ...valid(),
        sectionHistory: 'tabs', 
      },
      /option "sectionHistory" expects "shared" or "separate", got string "tabs"/,
    ],
  ])('%s → a clear error', (
    _name, options, message,
  ) => {
    expect(() => createNavigation(options as never)).toThrow(message);
  });

  it('valid options pass; the key list matches the options type', () => {
    expect(() => createNavigation({
      ...valid(),
      sections: {
        a: '/a', 
      },
      keep: 0,
      exitMs: 0,
      schedule: () => undefined,
      sectionHistory: 'shared', 
    })).not.toThrow();
    const all: Required<TNavigationOptions> = {
      ...valid(),
      sections: {},
      keep: 1,
      exitMs: 1,
      schedule: () => undefined,
      sectionHistory: 'separate',
    };
    expect([...NAVIGATION_OPTION_KEYS].sort()).toEqual(Object.keys(all).sort());
  });
});

describe('createNavigationView arguments', () => {
  const kit = {
    createElement: () => null,
    createContext: () => ({
      Provider: null, 
    }),
    useContext: () => null,
    useEffect: () => undefined,
    useRef: () => ({
      current: null, 
    }),
    useState: () => [null, () => undefined],
  } as unknown as TViewKit;
  const render: TNavigationViewOptions = {
    renderPage: () => null,
    renderWindow: () => null, 
  };

  it.each<[string, () => unknown, RegExp]>([
    [
      'no kit',
      () => createNavigationView(
        null as never, createNavigation(valid()), render,
      ),
      /the view kit expects \{ createElement, createContext, useContext, useEffect, useRef, useState \}/,
    ],
    [
      'a kit without hooks',
      () => createNavigationView(
        {
          createElement: () => null, 
        } as never, createNavigation(valid()), render,
      ),
      /the view kit expects/,
    ],
    [
      'no navigation',
      () => createNavigationView(
        kit, {} as never, render,
      ),
      /expects a navigation from createNavigation, got object/,
    ],
    [
      'a null navigation',
      () => createNavigationView(
        kit, null as never, render,
      ),
      /expects a navigation from createNavigation, got null/,
    ],
    [
      'no options',
      () => createNavigationView(
        kit, createNavigation(valid()), null as never,
      ),
      /expects an options object, got null/,
    ],
    [
      'a typo',
      () => createNavigationView(
        kit, createNavigation(valid()), {
          ...render,
          renderPages: 1, 
        } as never,
      ),
      /Did you mean "renderPage"\?/,
    ],
    [
      'renderWindow missing',
      () => createNavigationView(
        kit, createNavigation(valid()), {
          renderPage: () => null, 
        } as never,
      ),
      /option "renderWindow" expects a function, got undefined/,
    ],
  ])('%s → a clear error', (
    _name, call, message,
  ) => {
    expect(call).toThrow(message);
  });

  it('the key list matches the options type', () => {
    expect([...NAVIGATION_VIEW_OPTION_KEYS].sort()).toEqual(Object.keys(render).sort());
  });
});

describe('createBrowserHistory arguments', () => {
  it('an unknown mode → a clear error', () => {
    expect(() => createBrowserHistory({} as Window, 'memory' as never)).toThrow('[fundamentool] createBrowserHistory: mode expects "hash" or "path", got memory');
  });
});
