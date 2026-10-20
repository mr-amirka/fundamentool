/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * Tabs — rows with `section` in the route table — every tab keeps its own history (fundamentool D-017, D-039).
 */
import {
  setup as harness,
  settle,
  waitFor,
} from './_harness';
import type {
  TRouteRow,
} from '../../src/router';

/** Tabs a (first) and b with their own histories; `list` pages are kept. */
function setup(start = '/a') {
  return harness({}, start);
}

describe('createNavigator — a history per tab', () => {
  it('every tab keeps its own stack; the browser history holds the shown one over the first tab\'s main page', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    await nav.switchSection('b');
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
    expect(nav.getState().section).toBe('b');
    await nav.go('/b/1');
    await nav.switchSection('a');
    expect(paths()).toEqual([
      '/a',
      '/a/1',
    ]);
    expect(browser.paths()).toEqual([
      '/a',
      '/a/1',
    ]);
    await nav.switchSection('b');
    expect(paths()).toEqual([
      '/a',
      '/b',
      '/b/1',
    ]);
    expect(browser.index()).toBe(2);
  });

  it('tapping the current tab rolls its history back to the start', async () => {
    const {
      nav, paths,
    } = setup();
    await nav.switchSection('b');
    await nav.go('/b/1');
    await nav.go('/b/1/2');
    await nav.switchSection('b');
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
    await nav.switchSection('c'); // not a section: nothing
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
  });

  it('back from a tab\'s main page shows the first tab as it was; the tab left keeps its main page', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    await nav.switchSection('b');
    browser.userBack();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/1',
    ]));
    expect(nav.getState().section).toBe('a');
    await nav.switchSection('b');
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
  });

  it('a long back past a guarded page asks first; agreed — it stops at the tab\'s main page', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.switchSection('b');
    await nav.go('/b/form');
    let allow = false;
    nav.onBeforeLeave(nav.getState().page.id, () => allow);
    browser.userGo(-2);
    await settle(50);
    await waitFor(() => expect(browser.index()).toBe(2)); // stepped forward again: the guard said no
    expect(paths()).toEqual([
      '/a',
      '/b',
      '/b/form',
    ]);
    allow = true;
    browser.userGo(-2);
    await settle(50);
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b',
    ]));
    expect(nav.getState().section).toBe('b');
  });

  it('a jump back over entries by the player lands one entry back (Chrome skips entries made without a gesture — D-039)', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.switchSection('b');
    await nav.go('/b/1');
    browser.userGo(-2);
    await settle(50);
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b',
    ]));
    expect(browser.index()).toBe(1);
    await nav.back();
    expect(paths()).toEqual(['/a']);
    await nav.switchSection('b');
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
  });

  it('kept pages of hidden tabs stay mounted; windows of the shown tab close on a switch', async () => {
    const {
      nav,
    } = setup();
    await nav.go('/a/list');
    const kept = nav.getState().page.id;
    const win = nav.open('W');
    await settle();
    await nav.switchSection('b');
    await expect(win).resolves.toBeNull();
    const state = nav.getState();
    expect(state.layers.some((entry) => entry.id === kept)).toBe(true);
    expect(state.layers.map((entry) => entry.location.path)).toEqual([
      '/a/list',
      '/b',
    ]);
    await nav.switchSection('a'); // no windows to close now
    expect(nav.getState().page.id).toBe(kept);
  });

  it('a deep link into another tab starts with the first tab\'s main page under it', () => {
    const {
      paths, nav,
    } = setup('/b/7');
    expect(paths()).toEqual([
      '/a',
      '/b/7',
    ]);
    expect(nav.getState().section).toBe('b');
  });

  it('a page of no known section opens in the first tab; tapping that tab then goes to its main page', async () => {
    const {
      nav, paths,
    } = setup('/elsewhere');
    expect(paths()).toEqual(['/elsewhere']);
    expect(nav.getState().section).toBe('a');
    await nav.switchSection('a');
    expect(paths()).toEqual([
      '/elsewhere',
      '/a',
    ]);
  });

  it('startOver drops every tab\'s stack', async () => {
    const {
      nav, paths,
    } = setup();
    await nav.go('/a/list');
    await nav.switchSection('b');
    await nav.startOver('/a');
    expect(paths()).toEqual(['/a']);
    expect(nav.getState().layers.map((entry) => entry.location.path)).toEqual(['/a']);
    await nav.startOver('/b/x');
    expect(paths()).toEqual([
      '/a',
      '/b/x',
    ]);
  });

  it('a tab whose root is `/`: every page no other tab claims is in it', () => {
    const routes: readonly TRouteRow[] = [
      [
        '/',
        {
          main: 'home',
          section: 'home',
        },
      ],
      [
        '/b',
        {
          main: 'b',
          section: 'b',
        },
      ],
      [
        '/(.*)',
        {
          main: 'page',
        },
      ],
    ];
    const inB = harness({
      routes,
    }, '/b/1');
    expect(inB.paths()).toEqual([
      '/',
      '/b/1',
    ]);
    expect(inB.nav.getState().section).toBe('b');
    const inHome = harness({
      routes,
    }, '/x');
    expect(inHome.paths()).toEqual(['/x']);
    expect(inHome.nav.getState().section).toBe('home');
  });
});
