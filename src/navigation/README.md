# navigation

[Русская версия](./README.ru.md)

A stack of pages and windows in step with the browser history, a page cache, and a view built from an injected view
library. `import { createNavigation, createNavigationView, createBrowserHistory } from 'fundamentool/navigation'`.

- **Every page and every window is a history entry** — back (browser, Android, Escape) closes the top one.
  `await nav.open(Window, params)` resolves with what the window closed with (`null` — closed by back).
- **Covered pages stay mounted**, hidden with `display: none`; each page layer is its own scroll container, so a page
  comes back with its scroll and its data (checked in Chromium, WebKit, Firefox). Which pages: route flag `keep` and a
  count limit (`keep` option).
- **Tabs**: `sectionHistory: 'separate'` — every section keeps its own stack; tapping the current tab rolls it back to
  its main page; back from a tab's main page goes to the first tab.
- **Hooks**: `useWhileOpen` (open → starts closing), `useOnForward` (something opens over the page — `false` cancels, a
  promise holds the step, a returned function runs on return; windows only with `{ windows: true }`), `useBeforeLeave`
  (asked before leaving by back — "discard changes?"), `useEntry`, `useNavigation`, `useNavigationState`.
- **Nothing is imported directly**: the history is a port (`createBrowserHistory(window, 'hash' | 'path')`), the view
  library is a kit (`React`, or `preact` + `preact/hooks`).

```ts
const nav = createNavigation({
  history: createBrowserHistory(window),            // hash by default
  describe: (path) => ({ section: path.split('/')[1], keep: path.endsWith('/list') }),
  sections: { catalog: '/catalog', notes: '/notes' },
  sectionHistory: 'separate',
});
const view = createNavigationView(React, nav, {
  renderPage: (entry) => <Page path={entry.path} />,
  renderWindow: (entry, props) => <entry.window {...props} />,
});
root.render(<view.NavigationHost />);

const text = await nav.open(EditWindow, { text: 'Hi' }); // a window; null if closed by back
nav.startOver('/welcome');                                // sign out: every page before is gone
```

A five-tab test app using all of it: web-games `frontend/labs/navigation`.
