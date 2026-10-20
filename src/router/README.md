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
`go(delta)`, `watch(listener)` (a move by the player), `href(location)` (what the address bar shows).

- **Nested scopes**: a step in a part keeps the outer parts and clears the inner ones in that entry; Back / Forward
  restore an entry whole.
- **One timeline**: every entry carries its place. A Back by the player that jumps over entries (Chrome skips entries
  made without a user gesture) lands one entry back.
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
router.$location; router.$path; router.$query;          // the part's location
await router.pushLocation({ path: '/level/2' });         // a path (or the current one) with its query
await router.replaceLocation({ query: { tab: 'map' } });
await router.backLocation();
router.params.set('tab', 'map');                         // the query as a key-value storage: a new entry…
router.params.set('scroll', 120, { replace: true });     // …or the current one
```

`params` has the interface of `localStorageProvider` / `cookieStorageProvider` (`TKeyValueStorage`) and is
`storeProvider`'s port: `storeProvider(deps, router.params)` keeps stores in the address. One part — one router.

## The navigator — pages and windows

```ts
// deps.ts — imports no pages
export const nav = createNavigator({
  router, createObservable, createApi,
  createElement, forwardRef, Component, useEffect, useState, useRef, createContext, useContext, // React or Preact
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
  `await nav.open(Window, params)` resolves with what the window closed with (`null` — closed by Back).
- **Forward works**: what Back left stays ahead and comes back (a window reopened with its params);
  `nav.open(Confirm, params, { reopen: false })` — Forward stops before it (D-024).
- **The route table is the only description of the pages**: a row's `keep` (mounted while covered, at most `keep` —
  default 10) and `section` (a row with it is that tab's root) are the navigator's; the rest is the app's, drawn by
  `render(row, route, entry)` (default `<row.main route={route} />`, `route` — `{ params, location }`, params decoded).
  `renderMissing` — a path no row fits; `renderWindow` — a window (default `<entry.window {...props} />`).
- **Tabs**: rows with `section` — every tab keeps its own history; `nav.switchSection(name)` on the shown tab rolls it
  back to its root; Back from a tab's root shows the first tab; a page belongs to the tab it was opened in.
- **A reload** restores the stack from the history: the pages below the top are `dormant` (not mounted) until reached;
  the windows' entries are passed (a window isn't reopened, D-011).
- **More**: `nav.startOver(location)` (sign out — every page before is gone), `nav.leavePage({ fallback })` (a page
  without access: back, or `fallback` in its place), `nav.switchSection`, `nav.backToSection`; leave guards and forward
  handlers — `nav.onBeforeLeave`, `nav.onForward`, `nav.whileOpen` and the hooks `useBeforeLeave`, `useOnForward`,
  `useWhileOpen`, `useEntry`, `useNavigatorState`; `nav.Link`, `nav.NavLink`.

A five-tab test app using all of it: web-games `frontend/labs/navigation`.

## Files

| File | What's in it |
|------|--------------|
| `historyPrimitives.ts` | the primitives over the browser's history and over an array; the nested parts, the timeline |
| `createRouter.ts` | a router: the part's location, its steps, `params` |
| `navigator.ts` | the navigator's engine: the stack, windows, tabs, guards, the restore after a reload |
| `navigatorState.ts` | the state from the stack: the mounted pages (`layers`), the tab shown |
| `navigatorView.ts` | the host, the hooks, `Link` / `NavLink` |
| `routeTable.ts` | the route table matched to a path |
| `location.ts` | the location a step goes to |
| `types.ts` | the types |
