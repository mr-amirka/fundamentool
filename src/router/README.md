# Router: history primitives, routers, the navigator

[Русская версия](./README.ru.md)

Three layers (fundamentool D-038, D-039):

```
browserHistoryPrimitivesProvider(window) → { url, hash, state }   one timeline, three nested parts of every entry
createRouter({ historyPrimitive })                                one part: its location, its steps, its `params`
createNavigator({ router, … })                                    pages and windows over a router
```

## History primitives

A primitive is one part of a history entry — the address (path + query) ⊃ its hash ⊃ the entry's own state — with how
the browser moves through the history hidden inside: `current()`, `push(location, data)`, `replace(location, data)`,
`canGo(delta)`, `go(delta)`, `watch((entry, from) => …)` (a move by the player — where the history is now and where it
was; nothing at subscription: a move is an event), `href(location)` (what the address bar shows). An entry read gives
its `location`, its `data` and its `index` — its place on the timeline.

- **Nested scopes**: a step in a part keeps the outer parts and clears the inner ones in that entry; Back / Forward
  restore an entry whole.
- **One timeline**: every entry carries its place (`index`). A Back by the player that jumps over entries (Chrome skips
  entries made without a user gesture) lands one entry back. A hash the player typed (or a plain `#anchor`) is the next
  entry.
- **Several routers at once** (D-039): a router per part; a navigator on one part moves to its own entries **by their
  places** (`entry.historyIndex`), not by counting — another router's steps on an inner part (a page's filter steps in
  the entry's own state) lie between them, and Back to an entry keeps that entry's own inner steps (C8, D-049).
- **The ends**: `canGo(delta)` — whether a move stays on the timeline (not before its first entry — that's another site;
  not past the last entry known — entries ahead made before a reload count once seen); a move it refuses isn't made,
  `go` resolves at once.
- `browserHistoryPrimitivesProvider(window)` — the same primitives for the same window.
  `memoryHistoryPrimitivesProvider(start)` — the same over an array (a widget, a preview, tests); `navigate(delta)` is
  the player's move.

## The router — one part

```ts
const router = createRouter({
  historyPrimitive: browserHistoryPrimitivesProvider(window).hash,
  createObservable,
  createApi,
});

// Go somewhere — a path (or the current one) with its query (a query left out is cleared)
await router.pushLocation({ path: '/level/2' });
await router.replaceLocation({ query: { tab: 'map' } });
// Change some parts, keep the rest — the query merged, a key set to undefined removed
await router.extendLocation({ query: { page: 2 } });
await router.extendLocation({ query: { page: undefined } }, { replace: true });

// Back — no arguments, a handler as it is
button.onclick = router.backLocation;
await router.backRepeat(3, { force: true });             // 3 steps in one move, without asking the leave guards

// Throttled — a call while the last one runs, or within 300 ms of its start, is skipped (a double tap)
card.onclick = () => router.pushLocationThrottled({ path: '/item/7' });
back.onclick = router.backLocationThrottled;

// The query as a key-value storage
router.params.set('tab', 'map');                         // a new entry…
router.params.set('scroll', 120, { replace: true });     // …or the current one
router.params.assign({ sort: 'price', page: 2 });        // several keys in one entry
```

**What is shown and where the history is** (D-045). `$location` / `$path` / `$query`, `getLocation()` and `params` are
**what is shown** — what the pages follow. `$actualLocation` / `$actualPath` / `$actualQuery`, `getActualLocation()`
and `actualParams` are **where the history actually is**. They differ only while quiet steps are pending.

```ts
await router.pushLocation({ path: '/wizard/3', query: { draft: 1 } }, { quiet: true });
router.$path.getState();          // '/home' — shown
router.$actualPath.getState();    // '/wizard/3'
router.actualParams.get('draft'); // 1
```

**The from-location**: `getFromLocation()` / `$fromLocation` — the location shown before the last change, in either
direction (`null` before the first): analytics' `from`, which list item to highlight after Back.

```ts
sendEvent(name, { screen: router.getLocation().path, from: router.getFromLocation()?.path });
```

**Quiet steps** — `{ quiet: true }` on `pushLocation`, `replaceLocation`, `extendLocation`, `backRepeat`, `params.set /
assign / remove / clear`, `nav.backToDepth`: the history (and the navigator's stack) changes, nothing is shown — the
pages and the hooks see it at the next step that isn't quiet; pages opened quietly aren't mounted until shown. A home
page under a deep link, a wizard's jump over several steps (each a history entry, only the last shown), leaving
onboarding.

`params` / `actualParams` have the interface of `localStorageProvider` / `cookieStorageProvider` (`TKeyValueStorage`:
`get`, `set`, `assign`, `remove`, `getKeys`, `clear`, `watch`) and are `storeProvider`'s port:
`storeProvider(deps, router.params)` keeps stores in the address. They read the query as last written; a changed key is
reported once the location (shown / actual) has it. One part — one router. `backLocation()` at the history's first
entry resolves `false` (a step back from there would leave the app) — or, with a navigator's `fallback`, goes there.

The router's plumbing is public: `router.historyPrimitive` (its part) and `router.attach(driver)` (a navigator — or a
driver of your own — takes its steps over; one per router).

## The navigator — pages and windows

```ts
// deps.ts — imports no pages
export const nav = createNavigator({
  router, createObservable, createApi,
  createElement, forwardRef, useEffect, useState, useRef, createContext, useContext, // React or Preact
});

// navigation.tsx — imports the pages: the route table goes to the host (no import cycle)
export const NavigationHost = nav.NavigationHostProvider({
  routes: [
    ['/', { main: Home, keep: true }],
    ['/level/:levelId', { main: Level }],
    ['/(.*)', { main: Home }],
  ],
  render: (row, route) => <Suspense fallback={null}><row.main route={route} /></Suspense>, // optional
});
```

- **Every page and every window is a history entry** — Back (browser, Android, Escape) closes the top one. The router's
  steps become pages: `router.pushLocation` opens one, `router.backLocation` closes the top entry.
- **A step of the shown page is the same page** (D-043): a step to the same row (`/wizard/1` → `/wizard/2`, a query
  change) is a new history entry, but the page stays mounted and gets the new `route`; Back returns the old one. Its
  leave guards are asked when it is left, not on its own steps; forward handlers — when something else opens over it.
  A row with `quietQuery: true` isn't even re-rendered when only its query changes: its parts follow the query through
  `router.params` (`storeProvider(deps, router.params)`).
  `await nav.open(Window, params)` resolves with what the window closed with (`null` — closed by Back).
- **Forward works**: what Back left stays ahead and comes back (a window reopened with its params);
  `nav.open(Confirm, params, { reopen: false })` — Forward stops before it (D-024).
- **The route table is the only description of the pages**: a row's `keep` (mounted while covered, at most `keep` —
  default 10), `section` and `quietQuery` are the navigator's; the rest is the app's, drawn by
  `render(row, route, entry)` (default `<row.main route={route} />`, `route` — `{ params, location }`, params decoded).
  A path no row fits draws nothing — "not found" is a catch-all last row (`/(.*)`); `renderWindow` — a window (default
  `<entry.window {...props} />`). A new host gives a new table (a hot reload); two hosts mounted at once draw the same
  pages.
- **Sections (tabs)**: a row with `section: true` is a section's root (the first — the start section, its pattern
  without parameters); every section keeps its own history. A tab is a link to its root: from another section — that
  section as it was left (the link's address isn't applied); the first visit — its root at the link's address; in the
  same section — back to its start, and if the link's address differs, the start takes it. Back from a section's start
  shows the start section; a page belongs to the section it was opened in; `state.section` — the shown section's root
  pattern. `nav.backToRoot()` — back to the section's start (without sections — the first page).
- **A reload** restores the stack from the history: the pages below the top are `dormant` (not mounted) until reached;
  the windows' entries are passed (a window isn't reopened, D-011).
- **Backs**: `router.backLocation()`, `nav.leavePage()` (back a page — windows over it close too — or, at the first
  page, the navigator's `fallback` in its place, D-044) and `nav.backToRoot()` (the section's start) take no
  arguments — `onClick={nav.leavePage}`; with options — `router.backRepeat(count, { force, quiet })` and
  `nav.backToDepth(depth, { force, quiet })` (`0` — the very first page: sign out). `nav.startOver(location)` — every
  page before is gone (a list — a whole history in one step, below).
- **Reading the stack**: `nav.getHistory()` (the entries, bottom to top), `nav.getPrevLocation()` (what Back shows),
  `nav.getNextLocation()` (what Forward brings back), `nav.$depth` (the depth, observable —
  `nav.$depth.watch((depth) => …)`), `nav.$state` / `nav.getState()` / `nav.useNavigatorState()` (everything, re-rendering
  at every change) — with a selector only what it selects: `nav.useNavigatorState((state) => state.section)` re-renders
  a tab bar on a tab switch only (D-049; it is fundamentool's `useStoreMap`, `src/view`).
- **Guards and handlers**: `nav.onBeforeLeave`, `nav.onForward`, `nav.whileOpen` and the hooks `useBeforeLeave`,
  `useOnForward`, `useWhileOpen`. A hook belongs to the page it is called on (outside the host — the page on top; the
  fact hooks `useConfirmingLeave` / `useConfirmingLeaveEffect` follow whichever entry is on top as it changes — a
  header's mark stays right); it takes no id. **Leave being confirmed** (`entry.confirmingLeave`, D-047) — while the page's leave guards are asked it
  may be left, or stay:

  ```tsx
  const confirming = nav.useConfirmingLeave();   // re-renders only when it flips
  nav.useConfirmingLeaveEffect(() => {           // no re-render
    video.pause();
    return () => video.play();                   // confirming ended: the player stayed (or the page is gone)
  });
  nav.isConfirmingLeave(entryId);                // outside components
  nav.watchConfirmingLeave(entryId, (confirming) => …);
  ```

  **Leave guards as a fact** (`entry.leaveGuarded`, D-049) — the entry has a guard: leaving it would ask. Register a
  guard only while there is something to lose, and the fact means "unsaved":

  ```tsx
  nav.useBeforeLeave(dirty ? () => confirmDiscard() : null);  // null — no guard
  const unsaved = nav.useLeaveGuarded();                       // this page (outside the host — the entry on top)
  nav.useLeaveGuardedEffect(() => {                            // VK: the swipe-back can't wait for a question
    bridge.send('VKWebAppSetSwipeSettings', { history: false });
    return () => bridge.send('VKWebAppSetSwipeSettings', { history: true });
  });
  attachEvent(window, 'beforeunload', (event) => nav.isAnyLeaveGuarded() && event.preventDefault()); // the whole app
  nav.isLeaveGuarded(entryId); nav.watchLeaveGuarded(entryId, (guarded) => …);
  nav.watchAnyLeaveGuarded((guarded) => …); nav.useAnyLeaveGuarded();
  ```

  A store-like `watch…` (`watchConfirmingLeave`, `watchLeaveGuarded`, `watchAnyLeaveGuarded`) fires at once with the
  value, then on every flip (D-049). `nav.useEntry()` — the whole entry; it re-renders at every change of it, every step
  of the page included: prefer the hook for the one fact you need. The host passes a page's id down, so the hooks under
  a page don't re-render at its steps.
- **Links**: `nav.Link` / `nav.NavLink` are fundamentool's `linksProvider` (`src/view` — links for any router, with a
  navigator or without) plus the sections: `href` — a string read as `<a href>` reads it (`/x`, `?q=1`, `42`) or a
  change (`{ path, query }`, encoded); with a scheme or a host (`https://…`, `mailto:…`) — another site's, a plain
  anchor. A click with a modifier key (a new tab), `target="_blank"` or `download` is the browser's. `NavLink` is
  active on its address, under it (`activeAsParent`), when told (`active`), or while the section it leads to is shown;
  each re-renders only when its own target or mark changes.

A five-tab test app using it: web-games `frontend/labs/navigation` (arriving by a link — the unit tests,
`tests/router/navigator.arriving.test.ts`).

## Arriving by a link (D-050)

A link in a chat, a push notification, a VK link to the mini-app: the user lands on a page from outside — and some
pages must come first (onboarding, sign-in).

**A deep link lies over the home.** A first visit to a page other than the `fallback` puts the fallback under it (with
sections — the start section's root): every Back — the app's, the browser's, Android's — goes home, not out of the app.
The page under it waits dormant (not drawn until reached).

```ts
createNavigator({ router, …, fallback: { path: '/' } });
// opened at #/place/5  →  history [ /  ·  /place/5 ← shown ]  →  Back → /
```

**An address from outside opens over the shown page** — a typed address, a plain `<a href="#/route/7">` in an
article's HTML, what a platform reports (VK's `VKWebAppChangeFragment`). A step like any other: Back returns to where
the user was.

```ts
bridge.subscribe(({ detail }) => {
  if (detail.type === 'VKWebAppChangeFragment' && detail.data?.location) {
    router.pushLocation(urlParse(detail.data.location));
  }
});
// [ / · /place/5 ]  — a link to /route/7 arrives  →  [ / · /place/5 · /route/7 ]  →  Back → /place/5
```

**A whole history in one step** — `nav.startOver(location | locations, { quiet })`: every page and window dropped; a
list is written bottom to top, each read against the one before; only the last is shown, the rest wait dormant. A
section's root can only be first (it decides the section).

```ts
await nav.startOver({ path: '/signin' });                   // sign out
await nav.startOver([{ path: '/' }, { path: '/place/5' }]); // [ / · /place/5 ] — the home never shown
```

The browser keeps its entries ahead of a single page written in place (only a new entry drops them): the browser's
Forward may bring the old pages back — while a gate is closed, it holds them.

**Entry guards** — `nav.onBeforeEnter(({ location, row, params }) => …)` is asked before a location is shown: a step, a link, a tab, `startOver`,
the `fallback`, an address from outside, the page in the address at the start (not Back and Forward over pages already
in the stack). `true` — open it; a location — open that instead (asked again); `false` — not opened: the user stays
(at the start — the `fallback`). Synchronous: the start is decided before the first render.

```ts
// a locked level is never drawn — the tap does nothing; `params` — the row's, decoded ('/level/:levelId')
nav.onBeforeEnter(({ params }) => params.levelId === undefined || progress.isUnlocked(params.levelId));
// an old address — its new place
nav.onBeforeEnter(({ location }) => (location.path === '/old-shop' ? { path: '/shop' } : true));
```

**Gates** — pages that must come first. While a gate is closed only its pages are shown; any other location is
**held** and shown when the gate opens — over the `fallback`, nothing shown on the way.

```tsx
// deps.ts
export const nav = createNavigator({
  router, …,
  fallback: { path: '/' },
  gates: {
    signIn: { closed: $signedOut, to: { path: '/signin' } },               // passed first
    onboarding: { closed: $needsOnboarding, to: { path: '/onboarding' } },
  },
});
// navigation.tsx — the gates' pages
['/signin', { main: SignIn, gate: 'signIn' }],
['/onboarding', { main: Onboarding, gate: 'onboarding' }],
['/onboarding/:step', { main: Onboarding, gate: 'onboarding' }],
// Onboarding.tsx — plain steps, nothing carried along
<nav.Link href={`/onboarding/${step + 1}`}>Next</nav.Link>
await saveOnboardingPassed(); // $needsOnboarding → false: the navigator does the rest
```

The user taps a link to `/place/5` and hasn't passed onboarding:

| Moment | History | On screen |
|--------|---------|-----------|
| the app opens at `/place/5` | `[ /onboarding ]` | onboarding — `/place/5` is held, never drawn |
| Next, Next | `[ /onboarding · /onboarding/2 · /onboarding/3 ]` | the steps |
| a link to `/route/7` arrives | unchanged | the step stays; `/route/7` is held now (the newest wins) |
| a reload | as it was | the held link kept |
| `$needsOnboarding` → `false` | `[ / · /route/7 ]` | `/route/7`; the home never shown; Back → `/` |

- The first closed gate in order is the one to pass; the held link goes on from gate to gate (sign-in, then
  onboarding).
- A gate closing while another page is shown holds that page: signed out on `/profile` → `/signin` → signed in →
  `[ / · /profile ]`. A stack the history brings back while a gate is closed (Forward, a reload) is held too.
- `state.held` — the link waiting: `nav.useNavigatorState((state) => state.held)` ("next: the route …").
- Back from the gate's first page leaves the app; `leavePage` there does nothing (the `fallback` is outside the gate).
- A gate's page with the gate open is an ordinary page (to forbid it — `onBeforeEnter`).

## Files

| File | What's in it |
|------|--------------|
| `historyPrimitives.ts` | the primitives over the browser's history and over an array; the nested parts, the timeline |
| `createRouter.ts` | a router: the part's location, its steps, `params` |
| `constants.ts` | the parts' and entries' names, the defaults |
| `options.ts` | the steps' option keys and their check |
| `navigator.ts` | the navigator's engine: the stack, windows, tabs, guards, the restore after a reload |
| `navigatorState.ts` | the state from the stack: the mounted pages (`layers`), the tab shown |
| `navigatorView.ts` | the host, the hooks, the navigator's `Link` / `NavLink` (over `src/view`) |
| `routeTable.ts` | the route table matched to a path |
| `location.ts` | the location a step goes to; a link's `href`; what "under a path" means |
| `types.ts` | the types |
