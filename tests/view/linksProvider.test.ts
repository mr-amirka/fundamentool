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
  assertViewLibrary,
  linksProvider,
  VIEW_LIBRARY_KEYS,
} from '../../src/view';
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
    expect(() => assertViewLibrary(
      '[x]', library, VIEW_LIBRARY_KEYS,
    )).not.toThrow();
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
