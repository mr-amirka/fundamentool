import {
  createNavigation,
} from '../../src/navigation/createNavigation';
import type {
  TNavigationOptions,
  TPageInfo,
} from '../../src/navigation/createNavigation';
import {
  fakeHistory,
  settle,
  waitFor,
} from './_fakeHistory';

/** Sections a (first) and b; `list` pages are kept; `/form` pages may have guards. */
function describe_(path: string): TPageInfo {
  const section = path.split('/')[1];
  return {
    section,
    sectionHome: path.split('/').length === 2,
    keep: path.includes('list'), 
  };
}

function setup(start = '/a', overrides: Partial<TNavigationOptions> = {}) {
  const browser = fakeHistory(start);
  const nav = createNavigation({
    history: browser.port,
    describe: describe_,
    sections: {
      a: '/a',
      b: '/b', 
    },
    sectionHistory: 'separate',
    schedule: () => undefined,
    ...overrides,
  });
  const paths = () => nav.getState().entries.map((entry) => (entry.kind === 'page' ? entry.path : 'window'));
  return {
    nav,
    browser,
    paths, 
  };
}

describe('createNavigation — a separate history per section', () => {
  it('every tab keeps its own stack; the browser history holds the shown one over the first tab\'s main page', async () => {
    const {
      nav, browser, paths, 
    } = setup();
    await nav.go('/a/1');
    await nav.switchSection('b');
    expect(paths()).toEqual(['/a', '/b']);
    expect(nav.getState().section).toBe('b');
    await nav.go('/b/1');
    await nav.switchSection('a');
    expect(paths()).toEqual(['/a', '/a/1']);
    expect(browser.paths()).toEqual(['/a', '/a/1']);
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
    expect(paths()).toEqual(['/a', '/b']);
    await nav.switchSection('c'); // not a section: nothing
    expect(paths()).toEqual(['/a', '/b']);
  });

  it('back from a tab\'s main page shows the first tab as it was; the tab left keeps its main page', async () => {
    const {
      nav, browser, paths, 
    } = setup();
    await nav.go('/a/1');
    await nav.switchSection('b');
    browser.userBack();
    await waitFor(() => expect(paths()).toEqual(['/a', '/a/1']));
    expect(nav.getState().section).toBe('a');
    await nav.switchSection('b');
    expect(paths()).toEqual(['/a', '/b']);
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
    await waitFor(() => expect(browser.index()).toBe(2)); // stepped forward again: the guard said no
    expect(paths()).toEqual([
      '/a',
      '/b',
      '/b/form',
    ]);
    allow = true;
    browser.userGo(-2);
    await waitFor(() => expect(paths()).toEqual(['/a', '/b']));
    expect(nav.getState().section).toBe('b');
  });

  it('a long back without guards drops the inner pages and shows the first tab', async () => {
    const {
      nav, browser, paths, 
    } = setup();
    await nav.switchSection('b');
    await nav.go('/b/1');
    browser.userGo(-2);
    await waitFor(() => expect(paths()).toEqual(['/a']));
    await nav.switchSection('b');
    expect(paths()).toEqual(['/a', '/b']);
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
    expect(state.mounted.has(kept)).toBe(true);
    expect(state.layers.map((entry) => entry.path)).toEqual(['/a/list', '/b']);
    await nav.switchSection('a'); // no windows to close now
    expect(nav.getState().page.id).toBe(kept);
  });

  it('a deep link into another tab starts with the first tab\'s main page under it', () => {
    const {
      paths, nav, 
    } = setup('/b/7');
    expect(paths()).toEqual(['/a', '/b/7']);
    expect(nav.getState().section).toBe('b');
  });

  it('a page of no known section opens in the first tab; tapping that tab then goes to its main page', async () => {
    const {
      nav, paths, 
    } = setup('/elsewhere');
    expect(paths()).toEqual(['/elsewhere']);
    expect(nav.getState().section).toBe('a');
    await nav.switchSection('a');
    expect(paths()).toEqual(['/elsewhere', '/a']);
  });

  it('startOver drops every tab\'s stack', async () => {
    const {
      nav, paths, 
    } = setup();
    await nav.go('/a/list');
    await nav.switchSection('b');
    await nav.startOver('/a');
    expect(paths()).toEqual(['/a']);
    expect(nav.getState().layers.map((entry) => entry.path)).toEqual(['/a']);
    await nav.startOver('/b/x');
    expect(paths()).toEqual(['/a', '/b/x']);
  });

  it('needs sections', () => {
    expect(() => setup('/a', {
      sections: {}, 
    })).toThrow(/needs `sections`/);
  });
});
