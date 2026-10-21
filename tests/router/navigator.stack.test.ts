/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * The navigator's stack (fundamentool D-011…D-025, D-038, D-039): pages and windows as history entries, back and
 * Forward, guards and handlers, kept pages — on a real jsdom window (`_harness`).
 */
import {
  PLAIN,
  settle,
  setup,
  waitFor,
} from './_harness';

describe('createNavigator — the stack', () => {
  it('starts with the page in the address; the browser entry is ours', () => {
    const {
      nav, browser,
    } = setup();
    const state = nav.getState();
    expect(state.entries).toHaveLength(1);
    expect(state.page).toMatchObject({
      location: {
        path: '/a',
      },
      depth: 0,
      row: {
        section: true,
      },
      section: '/a',
    });
    expect(state.section).toBe('/a');
    expect(browser.state()).toMatchObject({
      fundamentool: 2,
      index: 0,
      data: {
        url: {
          depth: 0,
        },
      },
    });
  });

  it('go pushes a page and a history entry; back — ours or the browser\'s — removes it', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    await nav.go('/a/1/2');
    expect(paths()).toEqual([
      '/a',
      '/a/1',
      '/a/1/2',
    ]);
    expect(browser.paths()).toEqual([
      '/a',
      '/a/1',
      '/a/1/2',
    ]);

    await nav.back();
    expect(paths()).toEqual([
      '/a',
      '/a/1',
    ]);
    browser.userBack();
    await waitFor(() => expect(paths()).toEqual(['/a']));
    await nav.back(); // at the bottom: nothing
    expect(paths()).toEqual(['/a']);
  });

  it('open resolves with the result it closed with; back / Android back gives null; the exit plays, then it\'s gone', async () => {
    const {
      nav, browser, paths,
    } = setup();
    const first = nav.open<string>('Editor', {
      text: 'hi',
    });
    await settle();
    const win = nav.getState().entries[1];
    expect(win).toMatchObject({
      kind: 'window',
      window: 'Editor',
      params: {
        text: 'hi',
      },
    });
    expect(browser.paths()).toEqual([
      '/a',
      '/a',
    ]); // the address keeps the page
    await nav.close(win.id, 'saved');
    await expect(first).resolves.toBe('saved');
    expect(nav.getState().leaving).toHaveLength(1);
    await waitFor(() => expect(nav.getState().leaving).toHaveLength(0));
    expect(nav.getState().leaving).toHaveLength(0);

    const second = nav.open('Editor');
    await settle();
    browser.userBack();
    await expect(second).resolves.toBeNull();
    expect(paths()).toEqual(['/a']);
  });

  it('close: of an entry under others closes those too; an unknown id or the bottom page — nothing', async () => {
    const {
      nav, paths,
    } = setup();
    const lower = nav.open('A');
    await settle();
    const id = nav.getState().entries[1].id;
    const upper = nav.open('B');
    await settle();
    await nav.close(id, 1);
    await expect(lower).resolves.toBe(1);
    await expect(upper).resolves.toBeNull();
    await nav.close(999);
    await nav.close(nav.getState().entries[0].id);
    expect(paths()).toEqual(['/a']);
  });

  it('kept pages stay mounted while covered (within the limit); others unmount', async () => {
    const {
      nav,
    } = setup({
      keep: 1,
    });
    // Pages of other rows between them: two steps of one row next to each other would be one page (D-043).
    await nav.go('/a/list1');
    await nav.go('/a/x');
    await nav.go('/a/list2');
    await nav.go('/a/detail');
    const [
      home,
      list1,
      x,
      list2,
      detail,
    ] = nav.getState().entries;
    const mounted = new Set(nav.getState().layers.map((entry) => entry.id));
    expect([
      home,
      list1,
      x,
      list2,
      detail,
    ].map((entry) => mounted.has(entry.id))).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it('backToRoot goes back to the section\'s start; a link to the shown section\'s root rolls it back (D-043)', async () => {
    const {
      nav, paths, router,
    } = setup();
    await nav.go('/a/1');
    await nav.go('/a/1/2');
    nav.open('W');
    await settle();
    await expect(nav.backToRoot()).resolves.toBe(true);
    expect(paths()).toEqual(['/a']);
    await expect(nav.backToRoot()).resolves.toBe(true); // already there
    expect(paths()).toEqual(['/a']);

    await nav.switchSection('b');
    await nav.go('/b/1');
    expect(nav.getState().section).toBe('/b');
    const root = nav.getState().entries[1].id;
    await nav.switchSection('b'); // the section shown: back to its start
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
    // The link's address differs from the start: the start is replaced — the same root page, the new address.
    await router.pushLocation({
      path: '/b',
      query: {
        filter: 'new',
      },
    });
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
    expect(nav.getState().page).toMatchObject({
      id: root,
      location: {
        query: {
          filter: 'new',
        },
      },
    });
    await nav.switchSection('c'); // not a root: an ordinary page of the section shown
    expect(paths()).toEqual([
      '/a',
      '/b',
      '/c',
    ]);
    expect(nav.getState().section).toBe('/b');
    await expect(nav.backToDepth(0, {
      force: 1,
    } as never)).rejects.toThrow(/"force" expects true or false, got number 1/);
    await expect(nav.backToDepth(-1)).rejects.toThrow(/backToDepth: expects a depth/);
  });

  it('a deep link lays out over the start section\'s root; its start is the deep page; without sections — the first page', async () => {
    const deep = setup({}, '/b/7');
    expect(deep.paths()).toEqual([
      '/a',
      '/b/7',
    ]);
    expect(deep.nav.getState().section).toBe('/b');
    await expect(deep.nav.backToRoot()).resolves.toBe(true);
    expect(deep.paths()).toEqual([
      '/a',
      '/b/7',
    ]);
    await deep.nav.switchSection('b'); // the link to the root replaces the deep start
    expect(deep.paths()).toEqual([
      '/a',
      '/b',
    ]);

    const plain = setup({
      routes: PLAIN,
    }, '/b/7');
    await plain.nav.go('/x');
    await plain.nav.backToRoot();
    expect(plain.paths()).toEqual(['/b/7']);
    expect(plain.nav.getState().section).toBeNull();
  });

  it('startOver drops everything: windows resolve null, the history is back at its first entry', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    const win = nav.open('W');
    await settle();
    await nav.startOver('/b');
    await expect(win).resolves.toBeNull();
    // With tabs a stack starts over the start tab's root.
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
    expect(browser.index()).toBe(1);
    expect(browser.path()).toBe('/b');
  });

  it('whileOpen: runs at once, cleaned up when the entry starts closing, unsubscribing cleans up too', async () => {
    const {
      nav,
    } = setup();
    await nav.go('/a/1');
    const id = nav.getState().page.id;
    const log: string[] = [];
    nav.whileOpen(id, () => {
      log.push('open');
      return () => log.push('close');
    });
    await nav.back();
    expect(log).toEqual([
      'open',
      'close',
    ]);

    const stop = nav.whileOpen(nav.getState().page.id, () => () => log.push('unmounted'));
    stop();
    stop();
    expect(log).toEqual([
      'open',
      'close',
      'unmounted',
    ]);
  });

  it('onForward: pages only by default; its cleanup runs on return; false cancels; a promise delays', async () => {
    const {
      nav, paths,
    } = setup();
    const id = nav.getState().page.id;
    const log: string[] = [];
    const stop = nav.onForward(id, () => {
      log.push('forward');
      return () => log.push('back on top');
    });
    const result = nav.open('W');
    await settle();
    expect(log).toEqual([]); // a window isn't "forward" unless asked
    await nav.back();
    await expect(result).resolves.toBeNull();

    await nav.go('/a/1');
    expect(log).toEqual(['forward']);
    await nav.back();
    expect(log).toEqual([
      'forward',
      'back on top',
    ]);
    stop();

    nav.onForward(
      id, () => false, {
        windows: true,
      },
    );
    await expect(nav.go('/a/2')).resolves.toBe(false);
    await expect(nav.open('W')).resolves.toBeNull();
    expect(paths()).toEqual(['/a']);
  });

  it('onForward: a promise holds the step until it settles', async () => {
    const {
      nav, paths,
    } = setup();
    let release: () => void = () => undefined;
    nav.onForward(
      nav.getState().page.id, () => new Promise<void>((resolve) => {
        release = resolve;
      }), {
        windows: true,
      },
    );
    const going = nav.go('/a/1');
    await settle();
    expect(paths()).toEqual(['/a']);
    release();
    await expect(going).resolves.toBe(true);
    expect(paths()).toEqual([
      '/a',
      '/a/1',
    ]);
  });

  it('onBeforeLeave: a refusal keeps the entry (the browser is stepped forward again) and reopens whileOpen', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/form');
    const id = nav.getState().page.id;
    const log: string[] = [];
    nav.whileOpen(id, () => {
      log.push('open');
      return () => log.push('close');
    });
    let allow = false;
    const stop = nav.onBeforeLeave(id, () => allow);
    browser.userBack();
    await waitFor(() => expect(log).toEqual([
      'open',
      'close',
      'open',
    ]));
    expect(paths()).toEqual([
      '/a',
      '/a/form',
    ]);
    await waitFor(() => expect(browser.index()).toBe(1));

    allow = true;
    await nav.back();
    await waitFor(() => expect(paths()).toEqual(['/a']));
    expect(browser.index()).toBe(0);
    stop();
  });

  it('a guard may open a window to ask ("discard changes?") — it works while the leave waits', async () => {
    const {
      nav, paths,
    } = setup();
    await nav.go('/a/form');
    nav.onBeforeLeave(nav.getState().page.id, async () => (await nav.open<boolean>('Confirm')) === true);
    void nav.back();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/form',
      'window',
    ]));
    await nav.close(nav.getState().entries[2].id, true);
    await waitFor(() => expect(paths()).toEqual(['/a']));
  });

  it('a leave confirmed after the stack changed meanwhile does nothing more', async () => {
    const {
      nav, paths,
    } = setup();
    await nav.go('/a/form');
    let answer: ((value: boolean) => void) | null = null;
    nav.onBeforeLeave(nav.getState().page.id, () => new Promise<boolean>((resolve) => {
      answer = resolve;
    }));
    void nav.back();
    await waitFor(() => expect(answer).not.toBeNull());
    await nav.startOver('/a');
    (answer as unknown as (value: boolean) => void)(true);
    await settle(50);
    expect(paths()).toEqual(['/a']);
  });

  it('the browser\'s Forward brings back the page left by back — the same entry; a new step forgets it (D-024)', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    const left = nav.getState().page;
    await nav.back();
    expect(nav.getState().ahead).toEqual([left]);
    browser.userForward();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/1',
    ]));
    expect(nav.getState().page).toBe(left);
    expect(nav.getState().ahead).toEqual([]);

    await nav.back();
    await nav.go('/a/2');
    expect(nav.getState().ahead).toEqual([]);
    browser.userForward(); // nothing ahead any more — undone
    await settle(100);
    expect(paths()).toEqual([
      '/a',
      '/a/2',
    ]);
    expect(browser.index()).toBe(1);
  });

  it('Forward over several steps; replace and start over forget what is ahead', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    await nav.go('/a/2');
    await nav.back();
    await nav.back();
    browser.userGo(2);
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/1',
      '/a/2',
    ]));

    await nav.back();
    await nav.replace('/a/3');
    expect(nav.getState().ahead).toEqual([]);
    await nav.back();
    await nav.startOver('/a');
    expect(nav.getState().ahead).toEqual([]);
  });

  it('Forward reopens a closed window with its params — nobody awaits it; { reopen: false } windows stay closed (D-024)', async () => {
    const {
      nav, browser, paths,
    } = setup();
    const answer = nav.open('Menu', {
      scene: 1,
    });
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      'window',
    ]));
    await nav.back();
    await expect(answer).resolves.toBeNull();
    browser.userForward();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      'window',
    ]));
    expect(nav.getState().entries[1]).toMatchObject({
      window: 'Menu',
      params: {
        scene: 1,
      },
    });
    // Reopened while it was still playing its exit: it is no longer "leaving".
    expect(nav.getState().leaving).toEqual([]);
    await waitFor(() => expect(nav.getState().leaving).toHaveLength(0));

    // Menu → a confirmation that isn't reopened: back twice, Forward reopens the menu and stops there.
    void nav.open(
      'Confirm', undefined, {
        reopen: false,
      },
    );
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      'window',
      'window',
    ]));
    await nav.back();
    await nav.back();
    expect(nav.getState().ahead.map((entry) => (entry.kind === 'window' ? entry.window : entry.location.path))).toEqual(['Menu']);
    browser.userGo(2); // two steps ahead, but only the menu is kept: undone
    await settle(50);
    await waitFor(() => expect(browser.index()).toBe(0));
    expect(paths()).toEqual(['/a']);
    browser.userForward();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      'window',
    ]));
    browser.userForward(); // the confirmation isn't kept ahead: undone
    await settle(100);
    await waitFor(() => expect(browser.index()).toBe(1));
    expect(paths()).toEqual([
      '/a',
      'window',
    ]);
  });

  it('Forward asks the forward handlers of the page first: false keeps the player where they are', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    await nav.back();
    let allow = false;
    const asked: string[] = [];
    nav.onForward(nav.getState().page.id, () => {
      asked.push('page');
      return allow ? undefined : false;
    });
    browser.userForward();
    await waitFor(() => expect(asked).toEqual(['page']));
    await settle(100);
    expect(paths()).toEqual(['/a']);
    expect(browser.index()).toBe(0);

    allow = true;
    browser.userForward();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/1',
    ]));
    expect(browser.index()).toBe(1);
  });

  it('a window\'s Forward asks only handlers registered with { windows: true }', async () => {
    const {
      nav, browser, paths,
    } = setup();
    void nav.open('W');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      'window',
    ]));
    await nav.back();
    const asked: string[] = [];
    nav.onForward(nav.getState().page.id, () => {
      asked.push('pages only');
    });
    browser.userForward();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      'window',
    ]));
    expect(asked).toEqual([]);
  });

  it('an address from outside (another script\'s entry, a typed hash) opens over the shown page, in its section (D-050)', async () => {
    const {
      navigator, browser, paths,
    } = setup();
    browser.foreign('/b/old');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b/old',
    ]));
    expect(navigator.getState().section).toBe('/a'); // opened from the start section — a page belongs where it was opened
    expect(browser.paths()).toEqual([
      '/a',
      '/b/old',
    ]);
  });

  it('a failed step (e.g. the history refuses) rejects it but doesn\'t block the next ones', async () => {
    const {
      nav, browser, paths,
    } = setup();
    const restore = browser.refusePush();
    await expect(nav.go('/a/1')).rejects.toThrow('quota');
    restore();
    await nav.go('/a/2');
    expect(paths()).toEqual([
      '/a',
      '/a/2',
    ]);
  });

  it('replace: no new history entry; another row — a new page (its whileOpen cleaned up); the same row — the same page', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    const log: string[] = [];
    const id = nav.getState().page.id;
    nav.whileOpen(id, () => () => log.push('closed /a/1'));
    await nav.replace('/a/2'); // the same row (the catch-all): the same page, a new address
    expect(nav.getState().page.id).toBe(id);
    expect(log).toEqual([]);
    await nav.replace('/a/list');
    expect(paths()).toEqual([
      '/a',
      '/a/list',
    ]);
    expect(browser.paths()).toEqual([
      '/a',
      '/a/list',
    ]);
    expect(log).toEqual(['closed /a/1']);
    await nav.back();
    expect(paths()).toEqual(['/a']);
  });

  it('replace closes windows over the page first; a window that refuses to close keeps everything', async () => {
    const {
      nav, paths,
    } = setup();
    await nav.go('/a/1');
    const win = nav.open('W');
    await settle();
    await nav.replace('/a/2');
    await expect(win).resolves.toBeNull();
    expect(paths()).toEqual([
      '/a',
      '/a/2',
    ]);

    void nav.open('Form');
    await settle();
    nav.onBeforeLeave(nav.getState().entries[2].id, () => false);
    await nav.replace('/a/3');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/2',
      'window',
    ]));
  });

  it('back tells whether the entry was left; the entry is `confirmingLeave` while its guards are asked', async () => {
    const {
      nav,
    } = setup();
    await expect(nav.back()).resolves.toBe(false); // nothing to go back to
    await nav.go('/a/form');
    const id = nav.getState().page.id;
    let answer: (value: boolean) => void = () => undefined;
    nav.onBeforeLeave(id, () => new Promise<boolean>((resolve) => {
      answer = resolve;
    }));
    const first = nav.back();
    await waitFor(() => expect(nav.isConfirmingLeave(id)).toBe(true));
    answer(false);
    await expect(first).resolves.toBe(false);
    expect(nav.isConfirmingLeave(id)).toBe(false);
    const second = nav.back();
    await waitFor(() => expect(nav.isConfirmingLeave(id)).toBe(true));
    answer(true);
    await expect(second).resolves.toBe(true);
    expect(nav.isConfirmingLeave(id)).toBe(false);
  });

  it('back after the stack changed while a guard was asked: nothing more to leave', async () => {
    const {
      nav,
    } = setup();
    await nav.go('/a/form');
    let answer: (value: boolean) => void = () => undefined;
    nav.onBeforeLeave(nav.getState().page.id, () => new Promise<boolean>((resolve) => {
      answer = resolve;
    }));
    const leaving = nav.back();
    await waitFor(() => expect(nav.isConfirmingLeave(nav.getState().page.id)).toBe(true));
    await nav.startOver('/a');
    answer(true);
    await expect(leaving).resolves.toBe(false);
  });

  it('a back queued after a window\'s close counts from the stack as it is then: the window, then the page', async () => {
    const {
      nav, router, paths,
    } = setup();
    await nav.go('/a/level');
    void nav.open('Menu');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/level',
      'window',
    ]));
    const menu = nav.getState().entries[2].id;
    void nav.close(menu);
    await router.backLocation(); // queued behind the close: leaves the level, not the menu again
    await waitFor(() => expect(paths()).toEqual(['/a']));
  });

  it('backRepeat(n, { force: true }): back without asking — refusing guards are skipped, windows left resolve null (D-026)', async () => {
    const {
      nav, navigator, router, paths,
    } = setup();
    await nav.go('/a/form');
    const asked: string[] = [];
    nav.onBeforeLeave(nav.getState().page.id, () => {
      asked.push('form');
      return false;
    });
    const win = nav.open('Edit');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/form',
      'window',
    ]));
    await expect(router.backRepeat(1, {
      force: true,
    })).resolves.toBe(true);
    await expect(win).resolves.toBeNull();
    await expect(router.backRepeat(1, {
      force: true,
    })).resolves.toBe(true);
    expect(paths()).toEqual(['/a']);
    expect(asked).toEqual([]);

    await nav.go('/a/form');
    nav.onBeforeLeave(nav.getState().page.id, () => false);
    await nav.go('/a/list');
    // Two steps in one move, the refusing guard skipped; then sign out — to depth 0 without asking, nothing shown.
    await expect(router.backRepeat(2, {
      force: true,
    })).resolves.toBe(true);
    expect(paths()).toEqual(['/a']);
    await nav.go('/a/form');
    nav.onBeforeLeave(nav.getState().page.id, () => false);
    await expect(nav.backToDepth(0, {
      force: true,
      quiet: true,
    })).resolves.toBe(true);
    expect(navigator.getHistory()).toHaveLength(1); // the stack moved…
    expect(paths()).toEqual([
      '/a',
      '/a/form',
    ]); // …the state shown didn't (quiet)
    expect(router.$path.getState()).toBe('/a/form');
    expect(router.$actualPath.getState()).toBe('/a');
    await expect(router.backRepeat(0)).rejects.toThrow(/backRepeat: expects a whole number of steps ≥ 1, got number 0/);
  });

  it('leavePage: back to the previous page of the app (windows over the page close too); the first page is replaced', async () => {
    const {
      router, navigator, paths, win,
    } = setup({
      fallback: {
        path: '/a',
      },
    });
    await router.pushLocation({
      path: '/a/level',
    });
    void navigator.open('Menu');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/level',
      'window',
    ]));
    await navigator.leavePage();
    expect(paths()).toEqual(['/a']);

    await navigator.startOver({
      path: '/a/locked',
    });
    await navigator.leavePage();
    expect(paths()).toEqual(['/a']);
    expect(win.location.pathname).toBe('/a');
  });

  it('a navigator-wide fallback: leavePage() and backLocation() at the first page go there (D-044)', async () => {
    const {
      router, navigator, paths,
    } = setup({
      routes: PLAIN,
      fallback: {
        path: '/home',
      },
    }, '/locked');
    await expect(router.backLocation()).resolves.toBe(true);
    expect(paths()).toEqual(['/home']);
    await expect(router.backLocation()).resolves.toBe(false); // there already
    void navigator.open('Menu');
    await waitFor(() => expect(paths()).toEqual([
      '/home',
      'window',
    ]));
    await navigator.leavePage(); // the window over the fallback page closes
    expect(paths()).toEqual(['/home']);
    // An event a handler passes is ignored: leavePage is a handler as it is.
    await navigator.startOver({
      path: '/locked',
    });
    await (navigator.leavePage as (event: unknown) => Promise<void>)({
      type: 'click',
    });
    expect(paths()).toEqual(['/home']);

    const without = setup({
      routes: PLAIN,
    }, '/locked');
    await without.navigator.leavePage();
    await expect(without.router.backLocation()).resolves.toBe(false);
    expect(without.paths()).toEqual(['/locked']);
  });

  it('the navigator checks its fallback', () => {
    expect(() => setup({
      fallback: '/' as never,
    })).toThrow(/createNavigator: "fallback" expects a location/);
  });

  it('subscribe / unsubscribe', async () => {
    const {
      nav,
    } = setup();
    const listener = jest.fn();
    const stop = nav.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1); // at subscription (D-049 — a store's watch fires at once)
    await nav.go('/a/1');
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    await nav.go('/a/2');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('defaults: a closed window plays its exit for 300 ms', async () => {
    const {
      nav, browser,
    } = setup({
      exitMs: undefined,
    });
    const result = nav.open('W');
    await settle(100);
    browser.userBack();
    await expect(result).resolves.toBeNull();
    expect(nav.getState().leaving).toHaveLength(1);
    await settle(150);
    expect(nav.getState().leaving).toHaveLength(1);
    await waitFor(() => expect(nav.getState().leaving).toHaveLength(0));
  });
});
