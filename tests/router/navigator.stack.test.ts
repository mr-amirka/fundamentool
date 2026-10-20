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
        section: 'a',
      },
      section: 'a',
    });
    expect(state.section).toBe('a');
    expect(browser.state()).toMatchObject({
      fundamentool: 1,
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
    await nav.go('/a/list1');
    await nav.go('/a/list2');
    await nav.go('/a/detail');
    const [
      home,
      list1,
      list2,
      detail,
    ] = nav.getState().entries;
    const mounted = new Set(nav.getState().layers.map((entry) => entry.id));
    expect([
      home,
      list1,
      list2,
      detail,
    ].map((entry) => mounted.has(entry.id))).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it('the tab bar section is the nearest page with one; backToSection returns to its main page', async () => {
    const {
      nav, paths,
    } = setup();
    await nav.go('/a/1');
    await nav.go('/a/1/2');
    nav.open('W');
    await settle();
    await nav.backToSection();
    expect(paths()).toEqual(['/a']);
    await nav.backToSection(); // already there
    expect(paths()).toEqual(['/a']);

    await nav.switchSection('b');
    await nav.go('/b/1');
    expect(nav.getState().section).toBe('b');
    await nav.switchSection('b'); // the current tab again → its main page
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
    await nav.switchSection('c'); // no main page known
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
  });

  it('a deep link lays out over the start tab\'s root; backToSection opens its tab\'s root; without tabs — nothing', async () => {
    const deep = setup({}, '/b/7');
    expect(deep.paths()).toEqual([
      '/a',
      '/b/7',
    ]);
    expect(deep.nav.getState().section).toBe('b');
    await deep.nav.backToSection();
    expect(deep.paths()).toEqual([
      '/a',
      '/b/7',
      '/b',
    ]);

    const plain = setup({
      routes: PLAIN,
    }, '/b/7');
    await plain.nav.backToSection();
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

  it('an entry another script wrote starts the stack over at its path', async () => {
    const {
      browser, paths,
    } = setup();
    browser.foreign('/b/old');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b/old',
    ]));
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

  it('replace swaps the top page in place: no new history entry, its whileOpen cleaned up', async () => {
    const {
      nav, browser, paths,
    } = setup();
    await nav.go('/a/1');
    const log: string[] = [];
    nav.whileOpen(nav.getState().page.id, () => () => log.push('closed /a/1'));
    await nav.replace('/a/2');
    expect(paths()).toEqual([
      '/a',
      '/a/2',
    ]);
    expect(browser.paths()).toEqual([
      '/a',
      '/a/2',
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

  it('back tells whether the entry was left; isClosing is true while its guards are asked', async () => {
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
    await waitFor(() => expect(nav.isClosing(id)).toBe(true));
    answer(false);
    await expect(first).resolves.toBe(false);
    expect(nav.isClosing(id)).toBe(false);
    const second = nav.back();
    await waitFor(() => expect(nav.isClosing(id)).toBe(true));
    answer(true);
    await expect(second).resolves.toBe(true);
    expect(nav.isClosing(id)).toBe(false);
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
    await waitFor(() => expect(nav.isClosing(nav.getState().page.id)).toBe(true));
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

  it('{ force: true }: back without asking — refusing guards are skipped, windows left resolve null (D-026)', async () => {
    const {
      nav, router, paths,
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
    await expect(router.backLocation({
      force: true,
    })).resolves.toBe(true);
    await expect(win).resolves.toBeNull();
    await expect(router.backLocation({
      force: true,
    })).resolves.toBe(true);
    expect(paths()).toEqual(['/a']);
    expect(asked).toEqual([]);

    await nav.go('/a/form');
    nav.onBeforeLeave(nav.getState().page.id, () => false);
    await expect(router.backLocation({
      force: true,
    })).resolves.toBe(true);
    expect(paths()).toEqual(['/a']);
  });

  it('leavePage: back to the previous page of the app (windows over the page close too); the first page is replaced', async () => {
    const {
      router, navigator, paths, win,
    } = setup();
    await router.pushLocation({
      path: '/a/level',
    });
    void navigator.open('Menu');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/level',
      'window',
    ]));
    await navigator.leavePage({
      fallback: {
        path: '/a',
      },
    });
    expect(paths()).toEqual(['/a']);

    await navigator.startOver({
      path: '/a/locked',
    });
    await navigator.leavePage({
      fallback: {
        path: '/a',
      },
    });
    expect(paths()).toEqual(['/a']);
    expect(win.location.pathname).toBe('/a');
  });

  it('leavePage checks its options', async () => {
    const {
      navigator,
    } = setup();
    await expect(navigator.leavePage(null as never)).rejects.toThrow(/leavePage: expects an options object, got null/);
    await expect(navigator.leavePage({
      fallbak: {},
    } as never)).rejects.toThrow(/Did you mean "fallback"/);
    await expect(navigator.leavePage({
      fallback: '/',
    } as never)).rejects.toThrow(/"fallback" expects a location/);
  });

  it('subscribe / unsubscribe', async () => {
    const {
      nav,
    } = setup();
    const listener = jest.fn();
    const stop = nav.subscribe(listener);
    await nav.go('/a/1');
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    await nav.go('/a/2');
    expect(listener).toHaveBeenCalledTimes(1);
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
