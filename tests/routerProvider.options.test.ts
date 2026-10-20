/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * The router checks what it is given (lab convention `api-input-validation.md`): an unknown key — "did you mean"; a
 * wrong value — what was expected and what came.
 */
import {
  OPEN_OPTION_KEYS,
  ROUTER_DEPS_KEYS,
  NAVIGATION_HOST_OPTION_KEYS,
  routerProvider,
} from '../src/routerProvider';
import type {
  TOpenOptions,
  TRouterProviderDeps,
  TNavigationHostOptions,
} from '../src/routerProvider';
import {
  reactDeps,
  setup,
} from './_routerHarness';

const {
  JSDOM,
} = require('jsdom') as typeof import('jsdom');

const valid = () => reactDeps(new JSDOM('', {
  url: 'http://localhost/a',
}).window as unknown as Window);

describe('routerProvider dependencies', () => {
  it.each<[string, unknown, RegExp]>([
    [
      'not an object',
      null,
      /expects a dependencies object, got null/,
    ],
    [
      'an array',
      [],
      /expects a dependencies object, got array/,
    ],
    [
      'a typo',
      {
        ...valid(),
        describ: () => ({}),
      },
      /unknown option "describ"\. Did you mean "describe"\?/,
    ],
    [
      'no window',
      {
        ...valid(),
        window: {},
      },
      /"window" expects a browser window/,
    ],
    [
      'createApi not a function',
      {
        ...valid(),
        createApi: 1,
      },
      /"createApi" expects a function, got number 1/,
    ],
    [
      'describe not a function',
      {
        ...valid(),
        describe: 'x',
      },
      /"describe" expects a function \(location\) => page info/,
    ],
    [
      'sections not an object',
      {
        ...valid(),
        sections: '/a',
      },
      /"sections" expects an object section → main page path/,
    ],
    [
      'sections as an array',
      {
        ...valid(),
        sections: ['/a'],
      },
      /"sections" expects/,
    ],
    [
      'a section path not a string',
      {
        ...valid(),
        sections: {
          a: 1,
        },
      },
      /"sections" expects/,
    ],
    [
      'keep negative',
      {
        ...valid(),
        keep: -1,
      },
      /"keep" expects a number ≥ 0, got number -1/,
    ],
    [
      'exitMs not a number',
      {
        ...valid(),
        exitMs: '300',
      },
      /"exitMs" expects a number ≥ 0, got string "300"/,
    ],
    [
      'sectionHistory unknown',
      {
        ...valid(),
        sectionHistory: 'tabs',
      },
      /"sectionHistory" expects "shared" or "separate", got string "tabs"/,
    ],
    [
      'separate history without sections',
      {
        ...valid(),
        sectionHistory: 'separate',
      },
      /"sectionHistory" expects `sections` beside "separate"/,
    ],
  ])('%s → a clear error', (
    _name, deps, message,
  ) => {
    expect(() => routerProvider(deps as never)).toThrow(message);
  });

  it('the key lists match their types', () => {
    const deps: Record<keyof TRouterProviderDeps, true> = {
      window: true,
      Component: true,
      useEffect: true,
      createElement: true,
      forwardRef: true,
      useState: true,
      useRef: true,
      createContext: true,
      useContext: true,
      createObservable: true,
      createApi: true,
      describe: true,
      sections: true,
      sectionHistory: true,
      keep: true,
      exitMs: true,
    };
    expect([...ROUTER_DEPS_KEYS].sort()).toEqual(Object.keys(deps).sort());
    const open: Record<keyof TOpenOptions, true> = {
      reopen: true,
    };
    expect([...OPEN_OPTION_KEYS]).toEqual(Object.keys(open));
    const view: Record<keyof TNavigationHostOptions, true> = {
      renderPage: true,
      renderWindow: true,
    };
    expect([...NAVIGATION_HOST_OPTION_KEYS]).toEqual(Object.keys(view));
  });
});

describe('router.NavigationHostProvider arguments', () => {
  const render: TNavigationHostOptions = {
    renderPage: () => null,
    renderWindow: () => null,
  };

  it.each<[string, () => unknown, RegExp]>([
    [
      'dependencies without the view hooks',
      () => {
        const {
          useState: _useState, useRef: _useRef, ...rest
        } = valid();
        return routerProvider(rest as never).NavigationHostProvider(render);
      },
      /NavigationHostProvider: the dependencies lack useState, useRef/,
    ],
    [
      'no options',
      () => setup().router.NavigationHostProvider(null as never),
      /NavigationHostProvider: expects an options object, got null/,
    ],
    [
      'a typo',
      () => setup().router.NavigationHostProvider({
        ...render,
        renderPages: 1,
      } as never),
      /Did you mean "renderPage"\?/,
    ],
    [
      'renderWindow missing',
      () => setup().router.NavigationHostProvider({
        renderPage: () => null,
      } as never),
      /NavigationHostProvider: "renderWindow" expects a function, got undefined/,
    ],
  ])('%s → a clear error', (
    _name, call, message,
  ) => {
    expect(call).toThrow(message);
  });

  it('open checks its options', async () => {
    const {
      router,
    } = setup();
    await expect(router.open(
      'W', null, {
        reopn: false,
      } as never,
    )).rejects.toThrow(/Did you mean "reopen"/);
    await expect(router.open(
      'W', null, {
        reopen: 'no',
      } as never,
    )).rejects.toThrow(/"reopen" expects a boolean/);
    await expect(router.open(
      'W', null, 1 as never,
    )).rejects.toThrow(/expects an options object, got number 1/);
  });
});
