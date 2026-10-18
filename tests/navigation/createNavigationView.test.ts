/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
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
import * as preactHooks from 'preact/hooks';
import {
  act as preactAct,
} from 'preact/test-utils';
import {
  createNavigation,
} from '../../src/navigation/createNavigation';
import type {
  TNavigation,
  TPageEntry,
  TWindowEntry,
} from '../../src/navigation/createNavigation';
import {
  createNavigationView,
} from '../../src/navigation/createNavigationView';
import type {
  TNavigationView,
  TViewKit,
  TWindowProps,
} from '../../src/navigation/createNavigationView';
import {
  fakeHistory,
  settle,
  waitFor,
} from './_fakeHistory';

/** A view library under test: its kit and how to mount into a container. */
type TLibrary = {
  kit: TViewKit;
  mount: (view: TNavigationView, container: HTMLElement) => () => void;
  act: (work: () => Promise<void> | void) => Promise<void>;
};

const REACT: TLibrary = {
  kit: React as unknown as TViewKit,
  mount: (view, container) => {
    const root = createRoot(container);
    reactAct(() => root.render(React.createElement(view.NavigationHost as () => React.ReactElement)));
    return () => reactAct(() => root.unmount());
  },
  act: async (work) => {
    await reactAct(async () => {
      await work();
    });
  },
};

const PREACT: TLibrary = {
  kit: {
    createElement: preact.h as unknown as TViewKit['createElement'],
    createContext: preact.createContext as unknown as TViewKit['createContext'],
    useContext: preactHooks.useContext as unknown as TViewKit['useContext'],
    useEffect: preactHooks.useEffect as unknown as TViewKit['useEffect'],
    useRef: preactHooks.useRef as unknown as TViewKit['useRef'],
    useState: preactHooks.useState as unknown as TViewKit['useState'],
  },
  mount: (view, container) => {
    preactAct(() => {
      preact.render(preact.h(view.NavigationHost as unknown as preact.FunctionComponent, null), container);
    });
    return () => preact.render(null, container);
  },
  act: async (work) => {
    await preactAct(async () => {
      await work();
    });
  },
};

describe.each([['React', REACT], ['Preact', PREACT]])('createNavigationView with %s', (_name, library) => {
  let container: HTMLElement;
  let unmount: () => void;
  let nav: TNavigation;
  let view: TNavigationView;
  let browser: ReturnType<typeof fakeHistory>;
  const log: string[] = [];
  /** Exit animations wait here until a test runs them. */
  let timers: (() => void)[] = [];

  /** A page: shows its path, registers the hooks and logs what they see. */
  function Page(props: { entry: TPageEntry }): unknown {
    const h = library.kit.createElement;
    const entry = view.useEntry();
    view.useWhileOpen(() => {
      log.push(`open ${entry.depth}`);
      return () => log.push(`close ${entry.depth}`);
    });
    view.useOnForward(() => {
      log.push(`forward ${entry.depth}`);
    });
    view.useBeforeLeave(() => props.entry.path !== '/locked');
    return h(
      'p', {
        'data-page': props.entry.path, 
      }, props.entry.path,
    );
  }

  /** A page that reacts to windows too, and refuses to be left forward by a page when its path says so. */
  function Watcher(props: { entry: TPageEntry }): unknown {
    view.useOnForward(() => {
      log.push('covered');
      return () => log.push('uncovered');
    }, {
      windows: true, 
    });
    view.useOnForward(() => (props.entry.path === '/w/block' ? false : undefined));
    return library.kit.createElement(
      'p', {
        'data-page': props.entry.path, 
      }, props.entry.path,
    );
  }

  function Window(props: TWindowProps<string>): unknown {
    return library.kit.createElement(
      'dialog', {
        open: props.open,
        'data-window': props.params,
        'data-open': String(props.open), 
      },
      library.kit.createElement(
        'button', {
          onClick: () => props.close('ok'), 
        }, 'ok',
      ),
    );
  }

  beforeEach(() => {
    log.length = 0;
    timers = [];
    browser = fakeHistory('/list');
    nav = createNavigation({
      history: browser.port,
      describe: (path) => ({
        keep: path === '/list', 
      }),
      schedule: (callback) => {
        timers.push(callback);
      },
    });
    view = createNavigationView(
      library.kit, nav, {
        renderPage: (entry) => library.kit.createElement(entry.path.startsWith('/w/') ? Watcher : Page, {
          entry, 
        }),
        renderWindow: (entry: TWindowEntry, props) => library.kit.createElement(entry.window, props as unknown as Record<string, unknown>),
      },
    );
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
    expect(layers()).toEqual([[
      '0',
      'block',
      null,
    ]]);
    await library.act(() => nav.go('/detail').then(() => undefined));
    expect(layers()).toEqual([[
      '0',
      'none',
      'true',
    ], [
      '1',
      'block',
      null,
    ]]);
    await library.act(() => nav.go('/more').then(() => undefined));
    expect(layers()).toEqual([[
      '0',
      'none',
      'true',
    ], [
      '2',
      'block',
      null,
    ]]);
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
      await settle();
    });
    expect(container.querySelector('[data-window="edit"]')?.getAttribute('data-open')).toBe('true');
    await library.act(async () => {
      (container.querySelector('[data-window] button') as HTMLButtonElement).click();
      await settle();
    });
    await expect(result).resolves.toBe('ok');
    await library.act(() => waitFor(() => expect(container.querySelector('[data-window="edit"]')?.getAttribute('data-open')).toBe('false')));
    await library.act(() => {
      timers.forEach((run) => run());
    });
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
    expect(log).toEqual(['covered', 'uncovered']);
    await library.act(async () => {
      await expect(nav.go('/next')).resolves.toBe(false);
    });
    expect(nav.getState().page.path).toBe('/w/block');
  });

  it('a page whose guard refuses stays when the player goes back', async () => {
    await library.act(() => nav.go('/locked').then(() => undefined));
    await library.act(async () => {
      browser.userBack();
      await waitFor(() => expect(browser.index()).toBe(1)); // stepped forward again: the guard said no
    });
    expect(container.querySelector('[data-page="/locked"]')).not.toBeNull();
    expect(nav.getState().entries).toHaveLength(2);
  });

  it('a navigation hook outside a page or a window is an error', () => {
    const Outside = (): unknown => {
      view.useEntry();
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

  it('exposes the core', () => {
    let seen: TNavigation | null = null;
    const Probe = (): unknown => {
      seen = view.useNavigation();
      return null;
    };
    const host = document.createElement('div');
    if (library === REACT) {
      const root = createRoot(host);
      reactAct(() => root.render(React.createElement(Probe as () => null)));
      reactAct(() => root.unmount());
    } else {
      preact.render(preact.h(Probe as unknown as preact.FunctionComponent, null), host);
    }
    expect(seen).toBe(nav);
  });
});
