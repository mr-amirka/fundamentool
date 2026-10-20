/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * `router.NavigationHostProvider` and the router's hooks on React and on Preact — the view library is injected (fundamentool D-013).
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act as reactAct,
} from 'react';
import {
  createRoot,
} from 'react-dom/client';
import * as preact from 'preact';
import * as preactCompat from 'preact/compat';
import * as preactHooks from 'preact/hooks';
import {
  act as preactAct,
} from 'preact/test-utils';
import type {
  TPageEntry,
  TRouterState,
  TWindowEntry,
  TWindowProps,
} from '../src/routerProvider';
import {
  settle,
  setup,
  waitFor,
} from './_routerHarness';
import type {
  THarnessOptions,
} from './_routerHarness';

/** The router's host component (`NavigationHostProvider` returns it). */
type TView = () => unknown;

/** A view library under test: its functions for the router and how to mount into a container. */
type TLibrary = {
  deps: THarnessOptions;
  createElement: (...args: any[]) => unknown;
  mount: (view: TView, container: HTMLElement) => () => void;
  act: (work: () => Promise<void> | void) => Promise<void>;
};

const REACT: TLibrary = {
  deps: {},
  createElement: React.createElement as (...args: any[]) => unknown,
  mount: (view, container) => {
    const root = createRoot(container);
    reactAct(() => root.render(React.createElement(view as () => React.ReactElement)));
    return () => reactAct(() => root.unmount());
  },
  act: async (work) => {
    await reactAct(async () => {
      await work();
    });
  },
};

const PREACT: TLibrary = {
  deps: {
    Component: preact.Component,
    createElement: preact.h,
    forwardRef: preactCompat.forwardRef,
    createContext: preact.createContext,
    useContext: preactHooks.useContext,
    useEffect: preactHooks.useEffect,
    useRef: preactHooks.useRef,
    useState: preactHooks.useState,
  },
  createElement: preact.h as (...args: any[]) => unknown,
  mount: (view, container) => {
    preactAct(() => {
      preact.render(preact.h(view as unknown as preact.FunctionComponent, null), container);
    });
    return () => preact.render(null, container);
  },
  act: async (work) => {
    await preactAct(async () => {
      await work();
    });
  },
};

describe.each([
  [
    'React',
    REACT,
  ],
  [
    'Preact',
    PREACT,
  ],
])('router.NavigationHostProvider with %s', (_name, library) => {
  let container: HTMLElement;
  let unmount: () => void;
  let harness: ReturnType<typeof setup>;
  let nav: ReturnType<typeof setup>['nav'];
  let router: ReturnType<typeof setup>['router'];
  let browser: ReturnType<typeof setup>['browser'];
  let view: TView;
  const log: string[] = [];

  /** A page: shows its path, registers the hooks and logs what they see. */
  function Page(props: { entry: TPageEntry;
    path: string }): unknown {
    const h = library.createElement;
    const entry = router.useEntry();
    router.useWhileOpen(() => {
      log.push(`open ${entry.depth}`);
      return () => log.push(`close ${entry.depth}`);
    });
    router.useOnForward(() => {
      log.push(`forward ${entry.depth}`);
    });
    router.useBeforeLeave(() => props.path !== '/locked');
    return h(
      'p', {
        'data-page': props.path,
      }, props.path,
    );
  }

  /** A page that reacts to windows too, and refuses to be left forward by a page when its path says so. */
  function Watcher(props: { entry: TPageEntry;
    path: string }): unknown {
    router.useOnForward(() => {
      log.push('covered');
      return () => log.push('uncovered');
    }, {
      windows: true,
    });
    router.useOnForward(() => (props.path === '/w/block' ? false : undefined));
    return library.createElement(
      'p', {
        'data-page': props.path,
      }, props.path,
    );
  }

  function Window(props: TWindowProps<string>): unknown {
    return library.createElement(
      'dialog', {
        open: props.open,
        'data-window': props.params,
        'data-open': String(props.open),
      },
      library.createElement(
        'button', {
          onClick: () => props.close('ok'),
        }, 'ok',
      ),
    );
  }

  beforeEach(() => {
    log.length = 0;
    harness = setup({
      ...library.deps,
      describe: (path) => ({
        keep: path === '/list',
      }),
    }, '/list');
    ({
      nav, router, browser,
    } = harness);
    view = router.NavigationHostProvider({
      renderPage: (entry, location) => library.createElement(location.path.startsWith('/w/') ? Watcher : Page, {
        entry,
        path: location.path,
      }),
      renderWindow: (entry: TWindowEntry, props) => library.createElement(entry.window, props as unknown as Record<string, unknown>),
    }) as TView;
    container = document.createElement('div');
    document.body.appendChild(container);
    unmount = library.mount(view, container);
  });

  afterEach(() => {
    unmount();
    container.remove();
  });

  const layers = () => Array.from(container.querySelectorAll<HTMLElement>('[data-nav-layer]'))
    .map((layer) => [
      layer.getAttribute('data-nav-layer'),
      layer.style.display,
      layer.getAttribute('aria-hidden'),
    ]);

  it('the top page is shown; a kept page under it stays mounted, hidden; others unmount', async () => {
    expect(layers()).toEqual([
      [
        '0',
        'block',
        null,
      ],
    ]);
    await library.act(() => nav.go('/detail').then(() => undefined));
    expect(layers()).toEqual([
      [
        '0',
        'none',
        'true',
      ],
      [
        '1',
        'block',
        null,
      ],
    ]);
    await library.act(() => nav.go('/more').then(() => undefined));
    expect(layers()).toEqual([
      [
        '0',
        'none',
        'true',
      ],
      [
        '2',
        'block',
        null,
      ],
    ]);
    expect(log).toEqual([
      'open 0',
      'forward 0',
      'open 1',
      'forward 1',
      'close 1',
      'open 2',
    ]);
  });

  it('windows render over the page; closing plays the exit (open=false), then they leave', async () => {
    let result: Promise<string | null> = Promise.resolve(null);
    await library.act(async () => {
      result = nav.open<string>(Window, 'edit');
      await waitFor(() => expect(nav.getState().entries.at(-1)?.kind).toBe('window'));
    });
    expect(container.querySelector('[data-window="edit"]')?.getAttribute('data-open')).toBe('true');
    await library.act(async () => {
      (container.querySelector('[data-window] button') as HTMLButtonElement).click();
      await result;
    });
    await expect(result).resolves.toBe('ok');
    await library.act(() => waitFor(() => expect(container.querySelector('[data-window="edit"]')?.getAttribute('data-open')).toBe('false')));
    // The exit ends on a timer: wait for the state, then let the view render it.
    await waitFor(() => expect(nav.getState().leaving).toHaveLength(0));
    await library.act(() => settle(1));
    expect(container.querySelector('[data-window]')).toBeNull();
  });

  it('useOnForward: { windows: true } reacts to a window and its cleanup runs on return; false cancels a page', async () => {
    await library.act(() => nav.go('/w/block').then(() => undefined));
    log.length = 0;
    let result: Promise<string | null> = Promise.resolve(null);
    await library.act(async () => {
      result = nav.open<string>(Window, 'w');
      await waitFor(() => expect(nav.getState().entries.at(-1)?.kind).toBe('window'));
    });
    expect(container.querySelector('[data-window="w"]')).not.toBeNull();
    expect(log).toEqual(['covered']);
    await library.act(async () => {
      (container.querySelector('[data-window] button') as HTMLButtonElement).click();
      await result;
    });
    expect(log).toEqual([
      'covered',
      'uncovered',
    ]);
    await library.act(async () => {
      await expect(nav.go('/next')).resolves.toBe(false);
    });
    expect(nav.getState().page.location.path).toBe('/w/block');
  });

  it('a page whose guard refuses stays when the player goes back', async () => {
    await library.act(() => nav.go('/locked').then(() => undefined));
    await library.act(async () => {
      browser.userBack();
      await settle(50);
      await waitFor(() => expect(browser.index()).toBe(1)); // stepped forward again: the guard said no
    });
    expect(container.querySelector('[data-page="/locked"]')).not.toBeNull();
    expect(nav.getState().entries).toHaveLength(2);
  });

  it('a navigation hook outside a page or a window is an error', () => {
    const Outside = (): unknown => {
      router.useEntry();
      return null;
    };
    const host = document.createElement('div');
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => {
      if (library === REACT) {
        const root = createRoot(host);
        reactAct(() => root.render(React.createElement(Outside as () => null)));
      } else {
        preact.render(preact.h(Outside as unknown as preact.FunctionComponent, null), host);
      }
    }).toThrow(/outside a page or a window/);
    error.mockRestore();
  });

  it('useRouterState gives the router\'s state and follows it', async () => {
    const seen: TRouterState[] = [];
    const Probe = (): unknown => {
      seen.push(router.useRouterState());
      return null;
    };
    const host = document.createElement('div');
    let stop: () => void;
    if (library === REACT) {
      const root = createRoot(host);
      reactAct(() => root.render(React.createElement(Probe as () => null)));
      stop = () => reactAct(() => root.unmount());
    } else {
      preactAct(() => {
        preact.render(preact.h(Probe as unknown as preact.FunctionComponent, null), host);
      });
      stop = () => preact.render(null, host);
    }
    expect(seen.at(-1)).toBe(router.$state.getState());
    await library.act(() => nav.go('/next').then(() => undefined));
    expect(seen.at(-1)?.location.path).toBe('/next');
    stop();
  });
});

describe('a long back on the screen (D-026)', () => {
  it('backToStart is one move: the pages between are never shown or mounted again', async () => {
    const {
      nav, router,
    } = setup({
      describe: () => ({}),
    });
    const mounts: string[] = [];
    function Page(props: { path: string }): React.ReactElement {
      React.useEffect(() => {
        mounts.push(props.path);
      }, []);
      return React.createElement(
        'p', null, props.path,
      );
    }
    const view = router.NavigationHostProvider({
      renderPage: (_entry, location) => React.createElement(Page, {
        path: location.path,
      }),
      renderWindow: () => null,
    });
    const container = document.createElement('div');
    const unmount = REACT.mount(view as TView, container);
    for (const path of [
      '/a/1',
      '/a/2',
      '/a/3',
    ]) {
      await REACT.act(() => nav.go(path).then(() => undefined));
    }
    mounts.length = 0;
    await REACT.act(async () => {
      await router.backToStart();
    });
    expect(mounts).toEqual(['/a']);
    expect(container.textContent).toBe('/a');
    unmount();
  });
});
