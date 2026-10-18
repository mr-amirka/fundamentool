# Router: pages and windows

[Русская версия](./README.ru.md)

`routerProvider` / `hashRouterProvider` (`import { hashRouterProvider } from 'fundamentool'`) — the URL model and the
observables the router always had (`$location`, `$path`, `$query`, `Link`, `NavLink`, `paramStorage`,
`routerByLocationProvider`, `onBeforeUnload`, …), built on the engine in this folder (fundamentool D-022). The engine
is internal: use the router.

- **Every page and every window is a history entry** — back (browser, Android, Escape) closes the top one.
  `await router.open(Window, params)` resolves with what the window closed with (`null` — closed by back). A window
  keeps the page's address; the address never shows the window stack.
- **Covered pages stay mounted**, hidden with `display: none`; each page layer is its own scroll container, so a page
  comes back with its scroll and its data (checked in Chromium, WebKit, Firefox). Which pages: `describe` returns
  `keep: true`, at most `keep` (option, default 10) of them.
- **`replaceLocation`** swaps the top page in place (windows over it close first); **`startOverLocation`** clears the
  history (sign out, reset).
- **Tabs**: `sections` + `sectionHistory: 'separate'` — every section keeps its own history; `switchSection(name)` on
  the shown section rolls it back to its main page; back from a section's main page goes to the first section.
- **Watchers**: `onBeforeUnload(cb)` — asked before the current entry is left by back (`false` keeps it; may be async);
  with `{ forwards: true }` — before a page or a window opens over it. `useRouteIsFocus(effect)` — runs while the
  entry is open, cleaned up when it starts being left, again if leaving is refused.
- **View**: `router.view(kit, { renderPage, renderWindow })` — the host and the hooks `useWhileOpen`, `useOnForward`,
  `useBeforeLeave`, `useEntry`, `useNavigationState`, `useNavigation` (the engine — navigate with the router's methods).
  The kit is `React`, or `preact` + `preact/hooks`; the window and the view library are injected, never imported.

```ts
const router = hashRouterProvider({
  window, Component, useEffect, createElement, forwardRef, createObservable, createApi,
  describe: (location) => ({ section: location.path.split('/')[1], keep: location.path.endsWith('/list') }),
  sections: { catalog: '/catalog', notes: '/notes' },
  sectionHistory: 'separate',
});
const view = router.view(React, {
  renderPage: (entry, location) => <Page path={location.path} />,
  renderWindow: (entry, props) => <entry.window {...props} />,
});
root.render(<view.NavigationHost />);

await router.pushLocation({ path: '/notes/3' });
const text = await router.open(EditWindow, { text: 'Hi' }); // a window; null if closed by back
await router.replaceLocation({ path: '/level/2' });         // no new history entry
await router.startOverLocation({ path: '/welcome' });       // every page before is gone
```

A five-tab test app using all of it: web-games `frontend/labs/navigation`.
