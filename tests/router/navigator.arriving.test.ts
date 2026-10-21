/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * Arriving by a link (fundamentool D-050, research 13): a deep link's first visit, an address from outside, `startOver`
 * with a whole history, the entry guards, the gates — on a real jsdom window (`_harness`).
 */
import {
  createObservable,
} from '../../src/Observable';
import type {
  ObservableWritable,
} from '../../src/Observable';
import {
  createNavigator,
} from '../../src/router';
import type {
  TPageEntry,
  TRouteRow,
} from '../../src/router';
import {
  PAGE,
} from '../../src/router/constants';
import {
  urlParse,
} from '../../src/urlParse';
import {
  freshDeps,
  PLAIN,
  settle,
  setup,
  waitFor,
} from './_harness';

/** A page of the tables below (the tests read the stack, nothing is drawn). */
const Page = (): null => null;

/** Without sections: the onboarding gate's pages, then every other page. */
const ONBOARDING: readonly TRouteRow[] = [
  [
    '/onboarding',
    {
      main: Page,
      gate: 'onboarding',
    },
  ],
  [
    '/onboarding/:step',
    {
      main: Page,
      gate: 'onboarding',
    },
  ],
  [
    '/(.*)',
    {
      main: Page,
    },
  ],
];

/** Two gates: sign-in, then onboarding. */
const TWO_GATES: readonly TRouteRow[] = [
  [
    '/signin',
    {
      main: Page,
      gate: 'signIn',
    },
  ],
  ...ONBOARDING,
];

/** The sign-in gate alone. */
const SIGN_IN: readonly TRouteRow[] = [
  TWO_GATES[0],
  [
    '/(.*)',
    {
      main: Page,
    },
  ],
];

/** The onboarding gate: its store (`true` — the player hasn't passed it) and the option. */
function onboarding(needed: boolean) {
  const $needsOnboarding = createObservable(needed);
  return {
    $needsOnboarding,
    gates: {
      onboarding: {
        closed: $needsOnboarding,
        to: {
          path: '/onboarding',
        },
      },
    },
  };
}

/** The sign-in gate: its store (`true` — signed out) and the option. */
function signIn(signedOut: boolean) {
  const $signedOut = createObservable(signedOut);
  return {
    $signedOut,
    gates: {
      signIn: {
        closed: $signedOut,
        to: {
          path: '/signin',
        },
      },
    },
  };
}

/** The pages shown, in order: the top page's path at every published state (a repeat isn't a new one). */
function shownLog(navigator: { $state: { watch(fn: (state: { page: TPageEntry }) => void): unknown } }): string[] {
  const log: string[] = [];
  navigator.$state.watch((state) => {
    const path = state.page.location.path;
    if (log[log.length - 1] !== path) {
      log.push(path);
    }
  });
  return log;
}

/** The held location's path (`null` — none). */
const heldPath = (navigator: { getState(): { held: { path: string } | null } }) => navigator.getState().held?.path ?? null;

describe('createNavigator — arriving by a link (D-050)', () => {
  describe('a first visit', () => {
    it('without sections a deep link lies over the fallback: both Backs go home; the page under it waits dormant', async () => {
      const {
        navigator, browser, paths,
      } = setup({
        routes: PLAIN,
        fallback: {
          path: '/home',
        },
      }, '/place/5');
      expect(paths()).toEqual([
        '/home',
        '/place/5',
      ]);
      expect(browser.paths()).toEqual([
        '/home',
        '/place/5',
      ]);
      expect(browser.index()).toBe(1);
      expect((navigator.getState().entries[0] as TPageEntry).dormant).toBe(true);
      expect(navigator.getState().layers.map((entry) => entry.location.path)).toEqual(['/place/5']); // the home isn't mounted
      await navigator.leavePage(); // the app's Back
      expect(paths()).toEqual(['/home']);
      expect(navigator.getNextLocation()?.path).toBe('/place/5'); // a step back, not a replace: Forward brings it back

      const other = setup({
        routes: PLAIN,
        fallback: {
          path: '/home',
        },
      }, '/place/5');
      other.browser.userBack(); // the browser's Back (Android's, a swipe)
      await waitFor(() => expect(other.paths()).toEqual(['/home']));
    });

    it('nothing is laid under: a first visit to the fallback, no fallback, a reload, an app that stepped before its host', async () => {
      const fallback = {
        path: '/home',
      };
      expect(setup({
        routes: PLAIN,
        fallback,
      }, '/home').browser.paths()).toEqual(['/home']);
      expect(setup({
        routes: PLAIN,
      }, '/place/5').browser.paths()).toEqual(['/place/5']);
      const first = setup({
        routes: PLAIN,
        fallback,
      }, '/place/5');
      const reloaded = first.browser.reload();
      expect(reloaded.paths()).toEqual([
        '/home',
        '/place/5',
      ]);
      expect(reloaded.browser.paths()).toEqual([
        '/home',
        '/place/5',
      ]);
      const early = setup({
        routes: null,
        fallback,
      }, '/place/5');
      await early.router.pushLocation({
        path: '/x',
      });
      early.navigator.NavigationHostProvider({
        routes: PLAIN,
      });
      expect(early.paths()).toEqual([
        '/place/5',
        '/x',
      ]);
    });
  });

  describe('an address from outside', () => {
    it('opens over the shown page: the app\'s Back and the browser\'s agree', async () => {
      const {
        nav, navigator, browser, paths,
      } = setup({
        routes: PLAIN,
        fallback: {
          path: '/home',
        },
      }, '/home');
      await nav.go('/list/1');
      browser.foreign('/place/5'); // a plain <a href> in an article, another script's entry
      await waitFor(() => expect(paths()).toEqual([
        '/home',
        '/list/1',
        '/place/5',
      ]));
      expect(browser.paths()).toEqual([
        '/home',
        '/list/1',
        '/place/5',
      ]);
      expect(navigator.getPrevLocation()?.path).toBe('/list/1');
      await navigator.leavePage();
      expect(paths()).toEqual([
        '/home',
        '/list/1',
      ]);
      browser.foreign('/place/6');
      await waitFor(() => expect(paths()).toEqual([
        '/home',
        '/list/1',
        '/place/6',
      ]));
      browser.userBack();
      await waitFor(() => expect(paths()).toEqual([
        '/home',
        '/list/1',
      ]));
    });

    it('with sections a section\'s root from outside switches to that section', async () => {
      const {
        navigator, browser, paths,
      } = setup({}, '/a');
      browser.foreign('/b');
      await waitFor(() => expect(navigator.getState().section).toBe('/b'));
      expect(paths()).toEqual([
        '/a',
        '/b',
      ]);
    });

    it('an entry written before the app started, reached by Back, starts the stack over at it (as before)', async () => {
      const fresh = freshDeps('/#/zero');
      fresh.history.hash.push(urlParse('/one'));
      const navigator = createNavigator(fresh.deps);
      navigator.NavigationHostProvider({
        routes: PLAIN,
      });
      fresh.history.navigate(-1);
      await waitFor(() => expect(navigator.getState().location.path).toBe('/zero'));
      expect(navigator.getState().entries).toHaveLength(1);
    });
  });

  describe('startOver with a whole history', () => {
    it('lays it out in one step: every page but the last dormant, the last shown — nothing on the way', async () => {
      const {
        nav, navigator, browser, paths,
      } = setup({
        routes: PLAIN,
      }, '/x');
      await nav.go('/y');
      const win = navigator.open('W');
      await settle();
      const shown = shownLog(navigator);
      await navigator.startOver([
        {
          path: '/home',
        },
        {
          path: '/place/5',
        },
      ]);
      await expect(win).resolves.toBeNull();
      expect(paths()).toEqual([
        '/home',
        '/place/5',
      ]);
      expect(browser.paths()).toEqual([
        '/home',
        '/place/5',
      ]);
      expect(shown).toEqual([
        '/y',
        '/place/5',
      ]); // the home never shown
      expect((navigator.getState().entries[0] as TPageEntry).dormant).toBe(true);
      await navigator.leavePage();
      expect(paths()).toEqual(['/home']);
    });

    it('each location is read against the one before; quiet — nothing shown until the next step', async () => {
      const {
        router, navigator, paths,
      } = setup({
        routes: PLAIN,
      }, '/x');
      await navigator.startOver([
        {
          path: '/catalog',
          query: {
            q: 'tea',
          },
        },
        {
          query: {
            page: '2',
          },
        },
      ]);
      expect(navigator.getState().entries.map((entry) => (entry as TPageEntry).location.href)).toEqual([
        '/catalog?q=tea',
        '/catalog?page=2',
      ]);
      await navigator.startOver({
        path: '/quiet',
      }, {
        quiet: true,
      });
      expect(navigator.getState().location.path).toBe('/catalog');
      expect(router.getActualLocation().path).toBe('/quiet');
      await router.pushLocation({
        path: '/next',
      });
      expect(paths()).toEqual([
        '/quiet',
        '/next',
      ]);
    });

    it('checks what it is given', async () => {
      const {
        navigator,
      } = setup({}, '/a');
      await expect(navigator.startOver([])).rejects.toThrow(/startOver: expects a location \(\{ path, query, … \}\) or a non-empty list of them, got array/);
      await expect(navigator.startOver([
        {
          path: '/a',
        },
        5 as never,
      ])).rejects.toThrow(/non-empty list of them/);
      await expect(navigator.startOver({
        path: '/a',
      }, {
        quiet: 1,
      } as never)).rejects.toThrow(/startOver: "quiet" expects true or false, got number 1/);
      await expect(navigator.startOver({
        path: '/a',
      }, {
        qiet: true,
      } as never)).rejects.toThrow(/Did you mean "quiet"/);
      await expect(navigator.startOver([
        {
          path: '/a',
        },
        {
          path: '/b',
        },
      ])).rejects.toThrow(/"\/b" is a section's root — it can only be first/);
    });
  });

  describe('onBeforeEnter', () => {
    it('false keeps the player where they are; a location is opened instead and asked again; Back and Forward aren\'t asked', async () => {
      const {
        router, navigator, nav, browser, paths,
      } = setup({
        routes: PLAIN,
      }, '/home');
      const asked: string[] = [];
      const params: unknown[] = [];
      const stop = navigator.onBeforeEnter(({
        location, row, params: given,
      }) => {
        asked.push(location.path + (row ? '' : ' (no row)'));
        params.push(given);
        if (location.path === '/locked') {
          return false;
        }
        return location.path === '/old-shop' ? {
          path: '/shop',
        } : true;
      });
      await router.pushLocation({
        path: '/locked',
      });
      expect(paths()).toEqual(['/home']);
      await router.pushLocation({
        path: '/old-shop',
      });
      expect(paths()).toEqual([
        '/home',
        '/shop',
      ]);
      await router.replaceLocation({
        path: '/locked',
      });
      expect(paths()).toEqual([
        '/home',
        '/shop',
      ]);
      expect(asked).toEqual([
        '/locked',
        '/old-shop',
        '/shop',
        '/locked',
      ]);
      await router.pushLocation({
        path: '/games/list7',
      });
      expect(params[params.length - 1]).toMatchObject({
        tab: 'games',
        n: '7',
      }); // the row's parameters, decoded ('/:tab/list(:n)?') — as a page gets them
      await nav.back();
      asked.length = 0;
      await nav.back();
      browser.userForward();
      await waitFor(() => expect(paths()).toEqual([
        '/home',
        '/shop',
      ]));
      expect(asked).toEqual([]);
      stop();
      stop(); // a second call does nothing
      await router.pushLocation({
        path: '/locked',
      });
      expect(paths()).toEqual([
        '/home',
        '/shop',
        '/locked',
      ]);
    });

    it('the fallback of leavePage and backLocation is asked too: refused — the page stays', async () => {
      const {
        router, navigator, paths,
      } = setup({
        routes: PLAIN,
        fallback: {
          path: '/home',
        },
      }, '/home');
      await navigator.startOver({
        path: '/page',
      });
      navigator.onBeforeEnter(({
        location,
      }) => location.path !== '/home');
      await navigator.leavePage();
      expect(paths()).toEqual(['/page']);
      await expect(router.backLocation()).resolves.toBe(false);
      expect(paths()).toEqual(['/page']);
    });

    it('at the start: a refused page — the fallback; a redirect is laid out as a first visit; no fallback — the page opens', () => {
      const fallback = {
        path: '/home',
      };
      const refused = setup({
        routes: null,
        fallback,
      }, '/locked');
      refused.navigator.onBeforeEnter(({
        location,
      }) => location.path !== '/locked');
      refused.navigator.NavigationHostProvider({
        routes: PLAIN,
      });
      expect(refused.paths()).toEqual(['/home']);
      expect(refused.browser.paths()).toEqual(['/home']);

      const moved = setup({
        routes: null,
        fallback,
      }, '/old-shop');
      moved.navigator.onBeforeEnter(({
        location,
      }) => (location.path === '/old-shop' ? {
        path: '/shop',
      } : true));
      moved.navigator.NavigationHostProvider({
        routes: PLAIN,
      });
      expect(moved.paths()).toEqual([
        '/home',
        '/shop',
      ]);

      const alone = setup({
        routes: null,
      }, '/locked');
      alone.navigator.onBeforeEnter(() => false);
      alone.navigator.NavigationHostProvider({
        routes: PLAIN,
      });
      expect(alone.paths()).toEqual(['/locked']); // nothing else to show
    });

    it('checks what it is given and what the guards answer; a loop of redirects is an error', async () => {
      const {
        router, navigator,
      } = setup({
        routes: PLAIN,
      }, '/home');
      expect(() => navigator.onBeforeEnter(5 as never)).toThrow(/onBeforeEnter: expects a function, got number 5/);
      const stop = navigator.onBeforeEnter(() => 'yes' as never);
      await expect(router.pushLocation({
        path: '/x',
      })).rejects.toThrow(/onBeforeEnter: a guard answers true, false or a location \(\{ path, … \}\), got string "yes"/);
      stop();
      navigator.onBeforeEnter(({
        location,
      }) => ({
        path: location.path + 'x',
      }));
      await expect(router.pushLocation({
        path: '/x',
      })).rejects.toThrow(/more than 10 redirects in a row — a loop\?/);
    });
  });

  describe('gates', () => {
    it('a deep link at the start is held; the gate\'s page is shown alone — the deep page is never drawn', () => {
      const {
        gates,
      } = onboarding(true);
      const {
        navigator, browser, paths,
      } = setup({
        routes: ONBOARDING,
        fallback: {
          path: '/home',
        },
        gates,
      }, '/place/5');
      expect(paths()).toEqual(['/onboarding']);
      expect(browser.paths()).toEqual(['/onboarding']);
      expect(heldPath(navigator)).toBe('/place/5');
      expect(navigator.getState().layers.map((entry) => entry.location.path)).toEqual(['/onboarding']);
    });

    it('its steps are plain; a link meanwhile is held instead (the newest wins); a reload keeps it; opening shows it over the fallback, nothing on the way', async () => {
      const {
        $needsOnboarding, gates,
      } = onboarding(true);
      const options = {
        routes: ONBOARDING,
        fallback: {
          path: '/home',
        },
        gates,
      };
      const {
        nav, navigator, browser, paths,
      } = setup(options, '/place/5');
      await nav.go('/onboarding/2');
      expect(paths()).toEqual([
        '/onboarding',
        '/onboarding/2',
      ]);
      await expect(nav.go('/route/7')).resolves.toBe(false); // the player stays
      expect(paths()).toEqual([
        '/onboarding',
        '/onboarding/2',
      ]);
      expect(heldPath(navigator)).toBe('/route/7');
      browser.foreign('/route/9'); // an address from outside — held too
      await waitFor(() => expect(heldPath(navigator)).toBe('/route/9'));
      expect(paths()).toEqual([
        '/onboarding',
        '/onboarding/2',
      ]);

      const reloaded = browser.reload();
      expect(heldPath(reloaded.navigator)).toBe('/route/9');
      expect(reloaded.paths()).toEqual([
        '/onboarding',
        '/onboarding/2',
      ]);
      const shown = shownLog(reloaded.navigator);
      $needsOnboarding.setState(false);
      await waitFor(() => expect(reloaded.paths()).toEqual([
        '/home',
        '/route/9',
      ]));
      expect(reloaded.browser.paths()).toEqual([
        '/home',
        '/route/9',
      ]);
      expect(shown).toEqual([
        '/onboarding/2',
        '/route/9',
      ]); // the home never shown
      expect(heldPath(reloaded.navigator)).toBeNull();
    });

    it('nothing held: opening shows the fallback, without one the gate\'s page stays; a held page refused by a guard — the fallback', async () => {
      const fallback = {
        path: '/home',
      };
      const first = onboarding(true);
      const withFallback = setup({
        routes: ONBOARDING,
        fallback,
        gates: first.gates,
      }, '/onboarding');
      expect(heldPath(withFallback.navigator)).toBeNull();
      first.$needsOnboarding.setState(false);
      await waitFor(() => expect(withFallback.paths()).toEqual(['/home']));

      const second = onboarding(true);
      const noFallback = setup({
        routes: ONBOARDING,
        gates: second.gates,
      }, '/onboarding');
      second.$needsOnboarding.setState(false);
      await settle(20);
      expect(noFallback.paths()).toEqual(['/onboarding']);

      const third = onboarding(true);
      const refused = setup({
        routes: ONBOARDING,
        fallback,
        gates: third.gates,
      }, '/place/5');
      refused.navigator.onBeforeEnter(({
        location,
      }) => location.path !== '/place/5');
      third.$needsOnboarding.setState(false);
      await waitFor(() => expect(refused.paths()).toEqual(['/home']));
    });

    it('with sections the held page is laid out as its first visit would be — over the start root, in its section', async () => {
      const {
        $needsOnboarding, gates,
      } = onboarding(true);
      const routes: TRouteRow[] = [
        [
          '/a',
          {
            main: Page,
            section: true,
          },
        ],
        [
          '/b',
          {
            main: Page,
            section: true,
          },
        ],
        ...ONBOARDING,
      ];
      const {
        navigator, paths,
      } = setup({
        routes,
        gates,
      }, '/b/7');
      expect(paths()).toEqual(['/onboarding']);
      $needsOnboarding.setState(false);
      await waitFor(() => expect(paths()).toEqual([
        '/a',
        '/b/7',
      ]));
      expect(navigator.getState().section).toBe('/b');
    });

    it('several gates are passed in order; the held page goes from gate to gate; another gate\'s page isn\'t held', async () => {
      const sign = signIn(true);
      const board = onboarding(true);
      const {
        router, navigator, paths,
      } = setup({
        routes: TWO_GATES,
        fallback: {
          path: '/home',
        },
        gates: {
          ...sign.gates,
          ...board.gates,
        },
      }, '/place/5');
      expect(paths()).toEqual(['/signin']);
      expect(heldPath(navigator)).toBe('/place/5');
      await router.pushLocation({
        path: '/onboarding',
      }); // the next gate's page — not this one's, and not held
      expect(paths()).toEqual(['/signin']);
      expect(heldPath(navigator)).toBe('/place/5');
      sign.$signedOut.setState(false);
      await waitFor(() => expect(paths()).toEqual(['/onboarding']));
      expect(heldPath(navigator)).toBe('/place/5');
      board.$needsOnboarding.setState(false);
      await waitFor(() => expect(paths()).toEqual([
        '/home',
        '/place/5',
      ]));
    });

    it('a gate that closes while another page is shown holds it — sign out, sign in, back where the player was', async () => {
      const {
        $signedOut, gates,
      } = signIn(false);
      const {
        nav, navigator, paths,
      } = setup({
        routes: SIGN_IN,
        fallback: {
          path: '/home',
        },
        gates,
      }, '/home');
      await nav.go('/profile');
      $signedOut.setState(true);
      await waitFor(() => expect(paths()).toEqual(['/signin']));
      expect(heldPath(navigator)).toBe('/profile');
      $signedOut.setState(false);
      await waitFor(() => expect(paths()).toEqual([
        '/home',
        '/profile',
      ]));
    });

    it('Forward into the stack a gate started over from is held too; a reload while closed holds the restored page', async () => {
      const options = (gates: Record<string, { closed: ObservableWritable<boolean>;
        to: { path: string } }>) => ({
        routes: SIGN_IN,
        gates,
      });
      const {
        $signedOut, gates,
      } = signIn(false);
      const {
        nav, browser, paths,
      } = setup(options(gates), '/home');
      await nav.go('/profile');
      await nav.back(); // the profile ahead
      $signedOut.setState(true);
      await waitFor(() => expect(paths()).toEqual(['/signin']));
      browser.userForward(); // the old entry of the profile
      await settle(30);
      expect(paths()).toEqual(['/signin']);

      const before = signIn(false);
      const visit = setup(options(before.gates), '/home');
      await visit.nav.go('/profile');
      const reloaded = visit.browser.reload(options(signIn(true).gates)); // signed out meanwhile
      await waitFor(() => expect(reloaded.paths()).toEqual(['/signin']));
      expect(heldPath(reloaded.navigator)).toBe('/profile');
    });

    it('a location held before a reload with every gate open now: shown from the gate\'s page, dropped elsewhere', async () => {
      const options = (needed: boolean) => ({
        routes: ONBOARDING,
        fallback: {
          path: '/home',
        },
        gates: onboarding(needed).gates,
      });
      const first = setup(options(true), '/place/5');
      const reloaded = first.browser.reload(options(false)); // passed elsewhere meanwhile
      await waitFor(() => expect(reloaded.paths()).toEqual([
        '/home',
        '/place/5',
      ]));

      const fresh = freshDeps('/#/x');
      fresh.history.hash.replace(urlParse('/x'), {
        nav: 2,
        id: 1,
        depth: 0,
        stack: [
          [
            PAGE,
            1,
            '/x',
            null,
            0,
          ],
        ],
        shown: null,
        tabs: {},
        held: '/place/5',
      });
      const navigator = createNavigator({
        ...fresh.deps,
        gates: onboarding(false).gates,
      });
      navigator.NavigationHostProvider({
        routes: ONBOARDING,
      });
      expect(heldPath(navigator)).toBeNull();
      expect(navigator.getState().location.path).toBe('/x');
    });

    it('a step taken right as a gate closes — before it holds — shows the gate\'s page', async () => {
      const steps = [
        (router: { pushLocation: (location: { path: string }) => Promise<unknown> }) => router.pushLocation({
          path: '/x',
        }),
        (router: { replaceLocation: (location: { path: string }) => Promise<unknown> }) => router.replaceLocation({
          path: '/x',
        }),
      ];
      for (const step of steps) {
        const {
          $signedOut, gates,
        } = signIn(false);
        const {
          router, navigator, paths,
        } = setup({
          routes: SIGN_IN,
          gates,
        }, '/home');
        $signedOut.setState(true);
        await step(router as never);
        await waitFor(() => expect(paths()).toEqual(['/signin']));
        expect(heldPath(navigator)).toBe('/x');
      }
      const {
        $signedOut, gates,
      } = signIn(false);
      const {
        navigator, paths,
      } = setup({
        routes: SIGN_IN,
        gates,
      }, '/home');
      $signedOut.setState(true);
      await navigator.startOver({
        path: '/x',
      });
      await waitFor(() => expect(paths()).toEqual(['/signin']));
      expect(heldPath(navigator)).toBe('/x');
    });

    it('leaving the gate\'s first page goes nowhere — the fallback is outside the gate, and isn\'t held', async () => {
      const {
        gates,
      } = onboarding(true);
      const {
        navigator, paths,
      } = setup({
        routes: ONBOARDING,
        fallback: {
          path: '/home',
        },
        gates,
      }, '/place/5');
      await navigator.leavePage();
      expect(paths()).toEqual(['/onboarding']);
      expect(heldPath(navigator)).toBe('/place/5');
      await navigator.startOver({
        path: '/elsewhere',
      }); // a start over while closed: held, the player stays
      expect(paths()).toEqual(['/onboarding']);
      expect(heldPath(navigator)).toBe('/elsewhere');
    });

    it('a gate\'s page with the gate open is an ordinary page', () => {
      const {
        gates,
      } = onboarding(false);
      expect(setup({
        routes: ONBOARDING,
        fallback: {
          path: '/home',
        },
        gates,
      }, '/onboarding').paths()).toEqual([
        '/home',
        '/onboarding',
      ]);
    });

    it('checks the gates: their keys, their stores, their pages; a row naming no gate', () => {
      const deps = () => freshDeps().deps;
      expect(() => createNavigator({
        ...deps(),
        gates: 5 as never,
      })).toThrow(/"gates" expects \{ \[name\]: \{ closed, to \} \}, got number 5/);
      expect(() => createNavigator({
        ...deps(),
        gates: {
          a: 5,
        } as never,
      })).toThrow(/the gate "a" expects \{ closed, to \}, got number 5/);
      expect(() => createNavigator({
        ...deps(),
        gates: {
          a: {
            closed: createObservable(true),
            to: {
              path: '/a',
            },
            too: 1,
          },
        } as never,
      })).toThrow(/the gate "a": unknown option "too"\. Did you mean "to"\?/);
      expect(() => createNavigator({
        ...deps(),
        gates: {
          a: {
            closed: true,
            to: {
              path: '/a',
            },
          },
        } as never,
      })).toThrow(/"closed" expects a store of true \/ false \(getState \+ watch\), got boolean true/);
      expect(() => createNavigator({
        ...deps(),
        gates: {
          a: {
            closed: createObservable(true),
          },
        } as never,
      })).toThrow(/the gate "a": "to" expects its first page/);
      expect(() => createNavigator({
        ...deps(),
        gates: {
          a: {
            closed: createObservable(true),
            to: '/a',
          },
        } as never,
      })).toThrow(/the gate "a": "to" expects a location \(\{ path, query, … \}\), got string "\/a"/);

      const gated = createNavigator({
        ...deps(),
        gates: onboarding(true).gates,
      });
      expect(() => gated.NavigationHostProvider({
        routes: [
          [
            '/onboarding',
            {
              main: Page,
              gate: 'onbording',
            },
          ],
        ],
      })).toThrow(/the row "\/onboarding": "gate" expects the name of a gate \(createNavigator\(\{ gates \}\)\), got string "onbording"\. Did you mean "onboarding"\?/);
      expect(() => gated.NavigationHostProvider({
        routes: [
          [
            '/x',
            {
              main: Page,
              gate: 5 as never,
            },
          ],
        ],
      })).toThrow(/got number 5\. Gates: onboarding/);
      expect(() => gated.NavigationHostProvider({
        routes: [
          [
            '/(.*)',
            {
              main: Page,
            },
          ],
        ],
      })).toThrow(/the gate "onboarding": its page "\/onboarding" isn't one of its pages — mark its row `gate: 'onboarding'`/);
      expect(() => createNavigator(deps()).NavigationHostProvider({
        routes: [
          [
            '/x',
            {
              main: Page,
              gate: 'x',
            },
          ],
        ],
      })).toThrow(/Gates: none/);
    });
  });
});
