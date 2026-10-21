/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * Leave guards as a fact (fundamentool D-049): a page is `leaveGuarded` while it has a guard — registered only while
 * there is something to lose (`useBeforeLeave(dirty ? guard : null)`); the forms: hooks (this page, or outside the
 * host the entry on top), a getter and a watcher by id, the whole app's flag. And the selector of `useNavigatorState`,
 * the navigator's `NavLink` by sections.
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act,
} from 'react';
import {
  createObservable,
} from '../../src/Observable';
import type {
  TLinkProps,
} from '../../src/view';
import {
  inMemory,
  mount,
  waitFor,
} from './_harness';

const h = React.createElement;

function Plain(): React.ReactElement {
  return h(
    'p', null, 'page',
  );
}

describe('leave guards as a fact (D-049)', () => {
  it('a page is leaveGuarded only while it has a guard; a header outside the host follows the page on top', async () => {
    const {
      nav, router,
    } = inMemory('/#/home');
    const $dirty = createObservable(false);
    const effects: string[] = [];
    function Form(): React.ReactElement {
      const [
        dirty,
        setDirty,
      ] = React.useState($dirty.getState());
      React.useEffect(() => $dirty.watch(setDirty), []);
      nav.useBeforeLeave(dirty ? () => true : null); // a guard only while there is something to lose
      return h(
        'p', null, 'form',
      );
    }
    const view = nav.NavigationHostProvider({
      routes: [
        [
          '/home',
          {
            main: Plain,
          },
        ],
        [
          '/form',
          {
            main: Form,
          },
        ],
      ],
    });
    const header: string[] = [];
    function Header(): React.ReactElement {
      const guarded = nav.useLeaveGuarded(); // outside the host: the entry on top
      const any = nav.useAnyLeaveGuarded();
      nav.useLeaveGuardedEffect(() => {
        effects.push('guarded');
        return () => effects.push('unguarded');
      });
      header.push(`${String(guarded)} ${String(any)}`);
      return h(
        'header', null, 'h',
      );
    }
    const App = () => h(
      'div', null, h(Header), h(view as () => React.ReactElement),
    );
    const {
      unmount,
    } = mount(App);
    await act(() => router.pushLocation({
      path: '/form',
    }).then(() => undefined));
    const id = nav.getState().page.id;
    expect(nav.isLeaveGuarded(id)).toBe(false);
    await act(() => $dirty.setState(true)); // typed a letter
    expect(nav.isLeaveGuarded(id)).toBe(true);
    expect(nav.getState().page.leaveGuarded).toBe(true);
    expect(nav.isAnyLeaveGuarded()).toBe(true);
    await act(async () => {
      router.params.set('step', 2); // a step of the same page keeps the fact
      await waitFor(() => expect(nav.getHistory()).toHaveLength(3));
    });
    expect(nav.getState().page.leaveGuarded).toBe(true);
    await act(() => $dirty.setState(false)); // saved
    expect(nav.isLeaveGuarded(id)).toBe(false);
    expect(nav.isAnyLeaveGuarded()).toBe(false);
    expect(header).toEqual([
      'false false',
      'true true',
      'false false',
    ]);
    expect(effects).toEqual([
      'guarded',
      'unguarded',
    ]);
    // Guarded again, then left (the guard agrees): what is left has no guards any more
    await act(() => $dirty.setState(true));
    await act(() => router.backRepeat(2).then(() => undefined));
    expect(nav.getState().page.location.path).toBe('/home');
    expect(nav.isAnyLeaveGuarded()).toBe(false);
    expect(nav.getState().ahead.every((entry) => !entry.leaveGuarded)).toBe(true);
    unmount();
  });

  it('the getter and the watchers: by id and for the whole app — across sections; a watcher fires at once', async () => {
    const {
      nav, router,
    } = inMemory('/#/a');
    nav.NavigationHostProvider({
      routes: [
        [
          '/a',
          {
            main: Plain,
            section: true,
          },
        ],
        [
          '/b',
          {
            main: Plain,
            section: true,
          },
        ],
        [
          '/(.*)',
          {
            main: Plain,
          },
        ],
      ],
    });
    await router.pushLocation({
      path: '/a/edit',
    });
    const id = nav.getState().page.id;
    const byId: boolean[] = [];
    const any: boolean[] = [];
    const stopById = nav.watchLeaveGuarded(id, (guarded) => byId.push(guarded));
    const stopAny = nav.watchAnyLeaveGuarded((guarded) => any.push(guarded));
    const remove = nav.onBeforeLeave(id, () => true);
    await router.pushLocation({
      path: '/b',
    }); // another section: the guarded page waits in a's stack — the app still has something to lose
    expect(nav.isAnyLeaveGuarded()).toBe(true);
    expect(nav.isLeaveGuarded(id)).toBe(true);
    remove();
    expect(nav.isAnyLeaveGuarded()).toBe(false);
    expect(byId).toEqual([
      false,
      true,
      false,
    ]);
    expect(any).toEqual([
      false,
      true,
      false,
    ]);
    stopById();
    stopAny.unsubscribe();
  });
});

describe('useNavigatorState(select) and the navigator\'s NavLink (D-049)', () => {
  it('a selector re-renders only when its value changes; NavLink is active on its section\'s pages too', async () => {
    const {
      nav, router,
    } = inMemory('/#/a');
    const view = nav.NavigationHostProvider({
      routes: [
        [
          '/a',
          {
            main: Plain,
            section: true,
          },
        ],
        [
          '/b',
          {
            main: Plain,
            section: true,
          },
        ],
        [
          '/(.*)',
          {
            main: Plain,
          },
        ],
      ],
    });
    const renders: string[] = [];
    function TabBar(): React.ReactElement {
      const section = nav.useNavigatorState((state) => state.section);
      renders.push(String(section));
      return h(
        'nav', null,
        h(nav.NavLink as unknown as React.FC<TLinkProps>, {
          href: '/a',
          'data-tab': 'a',
        }),
        h(nav.NavLink as unknown as React.FC<TLinkProps>, {
          href: '/b',
          'data-tab': 'b',
        }),
      );
    }
    const App = () => h(
      'div', null, h(TabBar), h(view as () => React.ReactElement),
    );
    const {
      container, unmount,
    } = mount(App);
    const tab = (name: string) => container.querySelector(`[data-tab="${name}"]`)?.className;
    await act(() => router.pushLocation({
      path: '/a/1',
    }).then(() => undefined));
    await act(() => router.pushLocation({
      path: '/a/2',
    }).then(() => undefined));
    expect(tab('a')).toBe('active'); // a page of section a, not its root
    await act(() => router.pushLocation({
      path: '/b',
    }).then(() => undefined));
    expect(tab('a')).toBe('');
    expect(tab('b')).toBe('active');
    expect(renders).toEqual([
      '/a',
      '/b',
    ]); // two pages opened inside a: no re-render
    unmount();
  });
});
