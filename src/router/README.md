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
`canGo(delta)`, `go(delta)`, `watch(listener)` (a move by the player), `href(location)` (what the address bar shows).

- **Nested scopes**: a step in a part keeps the outer parts and clears the inner ones in that entry; Back / Forward
  restore an entry whole.
- **One timeline**: every entry carries its place. A Back by the player that jumps over entries (Chrome skips entries
  made without a user gesture) lands one entry back. A hash the player typed (or a plain `#anchor`) is the next entry.
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
  page before is gone.
- **Reading the stack**: `nav.getHistory()` (the entries, bottom to top), `nav.getPrevLocation()` (what Back shows),
  `nav.getNextLocation()` (what Forward brings back), `nav.$depth` (the depth, observable —
  `nav.$depth.watch((depth) => …)`), `nav.$state` / `nav.getState()` / `nav.useNavigatorState()` (everything).
- **Guards and handlers**: `nav.onBeforeLeave`, `nav.onForward`, `nav.whileOpen` and the hooks `useBeforeLeave`,
  `useOnForward`, `useWhileOpen`. A hook belongs to the page it is called on (outside the host — the page on top); it
  takes no id. **Leave being confirmed** (`entry.confirmingLeave`, D-047) — while the page's leave guards are asked it
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

  `nav.useEntry()` — the whole entry; it re-renders at every change of it, every step of the page included: prefer the
  hook for the one fact you need. The host passes a page's id down, so the hooks under a page don't re-render at its
  steps.
- **Links**: `nav.Link` / `nav.NavLink` with `href` — a string read as `<a href>` reads it (`/x`, `?q=1`, `42`) or a
  change (`{ path, query }`, encoded); `NavLink` is active on its address, under it (`activeAsParent`), or while the
  section it leads to is shown.

A five-tab test app using all of it: web-games `frontend/labs/navigation`.

## Files

| File | What's in it |
|------|--------------|
| `historyPrimitives.ts` | the primitives over the browser's history and over an array; the nested parts, the timeline |
| `createRouter.ts` | a router: the part's location, its steps, `params` |
| `constants.ts` | the parts' and entries' names, the defaults |
| `options.ts` | the steps' option keys and their check |
| `navigator.ts` | the navigator's engine: the stack, windows, tabs, guards, the restore after a reload |
| `navigatorState.ts` | the state from the stack: the mounted pages (`layers`), the tab shown |
| `navigatorView.ts` | the host, the hooks, `Link` / `NavLink` |
| `routeTable.ts` | the route table matched to a path |
| `location.ts` | the location a step goes to; a link's `href`; what "under a path" means |
| `types.ts` | the types |
