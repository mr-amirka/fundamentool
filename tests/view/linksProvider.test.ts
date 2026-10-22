/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * Links for any router (fundamentool D-049) — here a router alone, as a single-screen app keeping its settings in the
 * address: `Link` steps through it, `NavLink` marks the shown one; each re-renders only when its own target / mark does.
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
  createApi,
  createObservable,
} from '../../src/Observable';
import {
  createRouter,
  memoryHistoryPrimitivesProvider,
} from '../../src/router';
import {
  linksProvider,
  VIEW_LIBRARY_KEYS,
  viewLibraryShape,
} from '../../src/view';
import {
  object,
} from '../../src/schema';
import type {
  TLinkProps,
  TViewLibrary,
} from '../../src/view';

const LIBRARY = {
  createElement: React.createElement,
  forwardRef: React.forwardRef,
  useSyncExternalStore: React.useSyncExternalStore,
  useRef: React.useRef,
};

/** A router alone over the hash of an in-memory address, and its links. */
function setup(start = '/#/planets?n=Earth') {
  const history = memoryHistoryPrimitivesProvider(start);
  const router = createRouter({
    historyPrimitive: history.hash,
    createObservable,
    createApi,
  });
  return {
    history,
    router,
    ...linksProvider({
      router,
      ...LIBRARY,
    }),
  };
}

/**
 * Clicks `element` with `init` (a modifier key, a button); resolves whether the link took the click (prevented the
 * browser's default). Read after the links' handler, then prevented here — jsdom doesn't navigate.
 */
async function clickWith(
  container: HTMLElement, element: HTMLElement, init: MouseEventInit,
): Promise<boolean> {
  let taken = false;
  const look = (event: Event) => {
    taken = event.defaultPrevented;
    event.preventDefault();
  };
  container.addEventListener('click', look);
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...init,
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  container.removeEventListener('click', look);
  return taken;
}

function mount(view: () => unknown) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(React.createElement(view as () => React.ReactElement)));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
}

describe('linksProvider — a router without a navigator', () => {
  it('Link: a real <a href> in the router\'s part; a click steps there; onClick returning false cancels', async () => {
    const {
      router, Link,
    } = setup();
    const L = Link as unknown as React.FC<TLinkProps & { children?: React.ReactNode }>;
    let allow = true;
    const view = () => React.createElement(
      'nav', null,
      React.createElement(
        L, {
          href: '?n=Mars',
          'data-link': 'mars',
        }, 'Mars',
      ),
      React.createElement(
        L, {
          href: {
            path: '/moons',
          },
          component: 'button',
          onClick: () => allow,
          'data-link': 'moons',
        }, 'Moons',
      ),
    );
    const {
      container, unmount,
    } = mount(view);
    const mars = container.querySelector('[data-link="mars"]') as HTMLAnchorElement;
    expect(mars.getAttribute('href')).toBe('#/planets?n=Mars');
    await act(async () => {
      mars.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(router.getLocation().href).toBe('/planets?n=Mars');
    allow = false;
    const moons = container.querySelector('[data-link="moons"]') as HTMLButtonElement;
    await act(async () => {
      moons.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(router.getLocation().path).toBe('/planets');
    unmount();
  });

  it('a relative Link follows the location; an absolute one never re-renders', async () => {
    const {
      router, Link,
    } = setup();
    const renders: string[] = [];
    function Probe(props: { href: string;
      name: string; }): React.ReactElement {
      renders.push(props.name);
      return React.createElement(Link as unknown as React.FC<TLinkProps>, {
        href: props.href,
        'data-link': props.name,
      });
    }
    const Memo = React.memo(Probe);
    const view = () => React.createElement(
      'nav', null,
      React.createElement(Memo, {
        href: '?n=Mars',
        name: 'relative',
      }),
      React.createElement(Memo, {
        href: '/planets?n=Venus',
        name: 'absolute',
      }),
    );
    const {
      container, unmount,
    } = mount(view);
    await act(() => router.pushLocation({
      path: '/stars',
    }).then(() => undefined));
    // The relative link's address moved with the location; the absolute one stayed
    expect(container.querySelector('[data-link="relative"]')?.getAttribute('href')).toBe('#/stars?n=Mars');
    expect(container.querySelector('[data-link="absolute"]')?.getAttribute('href')).toBe('#/planets?n=Venus');
    unmount();
  });

  it('NavLink: active on its address, under it (activeAsParent), or when told (active); re-renders only when it flips', async () => {
    const {
      router, NavLink,
    } = setup('/#/planets');
    const N = NavLink as unknown as React.FC<TLinkProps>;
    const view = () => React.createElement(
      'nav', null,
      React.createElement(N, {
        href: '/planets',
        activeAsParent: true,
        className: 'tab',
        'data-nav': 'planets',
      }),
      React.createElement(N, {
        href: '/stars',
        'data-nav': 'stars',
      }),
      React.createElement(N, {
        href: '/moons',
        active: true,
        'data-nav': 'forced',
      }),
    );
    const {
      container, unmount,
    } = mount(view);
    const className = (name: string) => container.querySelector(`[data-nav="${name}"]`)?.className;
    expect(className('planets')).toBe('active tab');
    expect(className('stars')).toBe('');
    expect(className('forced')).toBe('active');
    await act(() => router.pushLocation({
      path: '/planets/earth',
    }).then(() => undefined));
    expect(className('planets')).toBe('active tab'); // under it
    await act(() => router.pushLocation({
      path: '/stars',
    }).then(() => undefined));
    expect(className('planets')).toBe('tab');
    expect(className('stars')).toBe('active');
    unmount();
  });

  it('a click the browser handles — a modifier key, another button, a target, a download — is left to it; onClick hears it', async () => {
    const {
      router, Link,
    } = setup('/#/planets');
    const L = Link as unknown as React.FC<TLinkProps>;
    const heard: string[] = [];
    const view = () => React.createElement(
      'nav', null,
      React.createElement(L, {
        href: '/moons',
        onClick: () => {
          heard.push('plain');
        },
        'data-link': 'plain',
      }),
      React.createElement(L, {
        href: '/moons',
        target: '_blank',
        onClick: () => false, // ignored: no step to cancel
        'data-link': 'blank',
      }),
      React.createElement(L, {
        href: '/moons',
        download: 'moons.html',
        'data-link': 'download',
      }),
      React.createElement(L, {
        href: '/moons',
        target: '_self',
        'data-link': 'self',
      }),
    );
    const {
      container, unmount,
    } = mount(view);
    const at = (name: string) => container.querySelector(`[data-link="${name}"]`) as HTMLAnchorElement;
    for (const init of [
      {
        metaKey: true,
      },
      {
        ctrlKey: true,
      },
      {
        shiftKey: true,
      },
      {
        altKey: true,
      },
      {
        button: 1,
      },
    ]) {
      await expect(clickWith(
        container, at('plain'), init,
      )).resolves.toBe(false); // not prevented: the browser opens it
    }
    await expect(clickWith(
      container, at('blank'), {},
    )).resolves.toBe(false);
    await expect(clickWith(
      container, at('download'), {},
    )).resolves.toBe(false);
    expect(heard).toEqual([
      'plain',
      'plain',
      'plain',
      'plain',
      'plain',
    ]);
    expect(router.getLocation().path).toBe('/planets'); // no step was taken
    await expect(clickWith(
      container, at('self'), {},
    )).resolves.toBe(true); // `_self` — a step of ours
    expect(router.getLocation().path).toBe('/moons');
    unmount();
  });

  it('an href outside the router\'s part (another site, mailto:, a host) is a plain anchor; NavLink isn\'t marked by it', async () => {
    const {
      router, Link, NavLink,
    } = setup('/#/faq');
    const L = Link as unknown as React.FC<TLinkProps>;
    const N = NavLink as unknown as React.FC<TLinkProps>;
    const heard: string[] = [];
    const view = () => React.createElement(
      'nav', null,
      React.createElement(L, {
        href: 'https://vk.com/faq?from=app',
        onClick: () => {
          heard.push('site');
        },
        'data-link': 'site',
      }),
      React.createElement(L, {
        href: 'mailto:help@example.com',
        'data-link': 'mail',
      }),
      React.createElement(N, {
        href: '//cdn.example/faq',
        'data-link': 'host',
      }),
    );
    const {
      container, unmount,
    } = mount(view);
    const at = (name: string) => container.querySelector(`[data-link="${name}"]`) as HTMLAnchorElement;
    expect(at('site').getAttribute('href')).toBe('https://vk.com/faq?from=app');
    expect(at('mail').getAttribute('href')).toBe('mailto:help@example.com');
    expect(at('host').getAttribute('href')).toBe('//cdn.example/faq');
    expect(at('host').className).toBe(''); // its path is the one shown, but it leads elsewhere
    await expect(clickWith(
      container, at('site'), {},
    )).resolves.toBe(false); // the browser follows it
    await expect(clickWith(
      container, at('host'), {},
    )).resolves.toBe(false);
    expect(heard).toEqual(['site']);
    expect(router.getLocation().href).toBe('/faq');
    unmount();
  });

  it('a Link without href points at the current location', () => {
    const {
      Link,
    } = setup('/#/planets?n=Earth');
    const {
      container, unmount,
    } = mount(() => React.createElement(Link as unknown as React.FC<TLinkProps>, {
      'data-link': 'here',
    }));
    expect(container.querySelector('[data-link="here"]')?.getAttribute('href')).toBe('#/planets?n=Earth');
    unmount();
  });

  it('VIEW_LIBRARY_KEYS match the view library\'s type', () => {
    const library: Required<TViewLibrary> = {
      ...LIBRARY,
      useEffect: React.useEffect,
      useState: React.useState,
      createContext: React.createContext,
      useContext: React.useContext,
    };
    expect([...VIEW_LIBRARY_KEYS].sort()).toEqual(Object.keys(library).sort());
    // The shape: the members needed must be functions, the rest may be left out
    const shape = object(viewLibraryShape(['useRef']));
    expect(() => shape.parse(library, '[x]')).not.toThrow();
    expect(() => shape.parse({}, '[x]')).toThrow('[x]: "useRef" expects the view library\'s function (React\'s, Preact\'s), got undefined');
  });

  it('checks what it is given', () => {
    expect(() => linksProvider(null as never)).toThrow(/linksProvider: expects an options object, got null/);
    expect(() => linksProvider({
      ...LIBRARY,
      router: {},
    } as never)).toThrow(/linksProvider: "router" expects a router/);
    const {
      router,
    } = setup();
    expect(() => linksProvider({
      ...LIBRARY,
      router,
      forwardRef: undefined,
    } as never)).toThrow(/linksProvider: "forwardRef" expects the view library's function/);
  });
});
