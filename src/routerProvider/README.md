# Router: pages and windows

[Русская версия](./README.ru.md)

`routerProvider` / `hashRouterProvider` (`import { hashRouterProvider } from 'fundamentool'`) — the URL model and the
observables the router always had (`$location`, `$path`, `$query`, `Link`, `NavLink`, `paramStorage`,
`routerByLocationProvider`, `onBeforeUnload`, …) and a stack of pages and windows in step with the browser history —
one router, one state (`$state` holds the address and the stack; fundamentool D-022, D-025).

- **Every page and every window is a history entry** — back (browser, Android, Escape) closes the top one.
  `await router.open(Window, params)` resolves with what the window closed with (`null` — closed by back). A window
  keeps the page's address; the address never shows the window stack.
- **Forward works**: what back left stays ahead, and the browser's Forward brings it back — a page with its address, a
  window reopened with the same params (a new window, nobody awaits its answer). Confirmations opt out:
  `router.open(ConfirmWindow, params, { reopen: false })` — Forward stops before them (D-024).
- **Covered pages stay mounted**, hidden with `display: none`; each page layer is its own scroll container, so a page
  comes back with its scroll and its data (checked in Chromium, WebKit, Firefox). Which pages: `describe` returns
  `keep: true`, at most `keep` (option, default 10) of them.
- **`replaceLocation`** swaps the top page in place (windows over it close first); **`startOverLocation`** clears the
  history (sign out, reset).
- **Going back several steps** (`backToDepth`, `backRepeat`, `backToStart`) is one browser move: the pages between
  are never shown. Leave confirmations are asked top first, and a refusal stops there; `{ force: true }` skips them
  (sign out, a forced return to the start); `{ quiet: true }` — `$location` and the rest don't follow (D-026).
- **A page without access leaves by itself** (D-031, D-032): the page checks access; without it,
  `router.leavePage({ fallback: { path: '/' } })` goes back to the previous page of the app if there is one (windows
  over the page close too), otherwise replaces the page with `fallback`. Or the page shows "unavailable" in its place.
- **Tabs**: `sections` + `sectionHistory: 'separate'` — every section keeps its own history; `switchSection(name)` on
  the shown section rolls it back to its main page; back from a section's main page goes to the first section.
- **Watchers**: `onBeforeUnload(cb)` — asked before the current entry is left by back (`false` keeps it; may be async);
  with `{ forwards: true }` — before a page or a window opens over it, including by the browser's Forward. `useRouteIsFocus(effect)` — runs while the
  entry is open, cleaned up when it starts being left, again if leaving is refused.
- **The host**: `router.NavigationHostProvider({ renderPage, renderWindow })` returns the `NavigationHost` component (D-036); the hooks are the router's: `useWhileOpen` (the same
  as the old `useRouteIsFocus`), `useOnForward`, `useBeforeLeave`, `useEntry`, `useRouterState`. The view library
  comes with the dependencies (`useState`, `useRef`, `createContext`, `useContext` beside `useEffect`,
  `createElement`, … — from React, or `preact` + `preact/hooks`); the window and the library are injected, never
  imported.

```ts
const router = hashRouterProvider({
  window, Component, useEffect, useState, useRef, createContext, useContext, createElement, forwardRef,
  createObservable, createApi,
  describe: (location) => ({ section: location.path.split('/')[1], keep: location.path.endsWith('/list') }),
  sections: { catalog: '/catalog', notes: '/notes' },
  sectionHistory: 'separate',
});
const NavigationHost = router.NavigationHostProvider({
  renderPage: (entry, location) => <Page path={location.path} />,
  renderWindow: (entry, props) => <entry.window {...props} />,
});
root.render(<NavigationHost />);

await router.pushLocation({ path: '/notes/3' });
const text = await router.open(EditWindow, { text: 'Hi' }); // a window; null if closed by back
await router.replaceLocation({ path: '/level/2' });         // no new history entry
await router.startOverLocation({ path: '/welcome' });       // every page before is gone
```

A five-tab test app using all of it: web-games `frontend/labs/navigation`.
