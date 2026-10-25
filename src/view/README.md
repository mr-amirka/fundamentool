# View bindings: hooks that read stores, links for any router

[Русская версия](./README.ru.md)

fundamentool's view code is built over a **React-like library the app passes in** (`TViewLibrary`: React, Preact
`compat`; later fundamentool's own) — fundamentool D-048, D-049. Two providers:

```ts
const LIBRARY = {
  createElement: React.createElement, forwardRef: React.forwardRef, useSyncExternalStore: React.useSyncExternalStore,
  useEffect: React.useEffect, useState: React.useState, useRef: React.useRef,
  createContext: React.createContext, useContext: React.useContext,
};
export const { useUnit, useStoreMap } = viewHooksProvider(LIBRARY);   // once, in the app's deps
export const { Link, NavLink } = linksProvider({ router, ...LIBRARY });
```

## `useUnit`, `useStoreMap` — effector-react's names and shapes

They read any store with `getState` + `watch` — fundamentool's (`createObservable`, a router's `$location`, a
navigator's `$state`) and effector's alike, so moving an app between them changes an import, not its code. Built on the
library's `useSyncExternalStore`: no update missed between the render and the subscription.

```tsx
const path = useUnit(router.$path);                                  // a value; re-renders when it changes
const [level, moves] = useUnit([$level, $moves]);                    // a list
const { coins, spend } = useUnit({ coins: $coins, spend: spendCoins }); // a shape; an event comes back as it is

// A part of a big store — re-renders only when that part changes
const section = useStoreMap(nav.$state, (state) => state.section);
// The full form: `keys` — what `fn` depends on besides the state; `updateFilter`, `defaultValue`
const confirming = useStoreMap({
  store: nav.$state,
  keys: [entryId],
  fn: (state, [id]) => state.entries.some((entry) => entry.id === id && entry.confirmingLeave),
});
```

- A list keeps its length and a shape its keys from render to render (as effector's).
- Don't write `useUnit($store.map(fn))` for a selector: that's `useStoreMap($store, fn)`. (A dropped `map` holds
  nothing — D-049 — but it is computed anew at every render.)

## `Link`, `NavLink` — for any router

A real `<a href>` (a new tab, copy the link, a middle click); a click steps through the router — one click at a time
across the links (a double tap steps once). A router without a navigator (a single-screen app keeping its settings in
the address) has links too; a navigator's `nav.Link` / `nav.NavLink` are these, plus its sections.

```tsx
<Link href="?n=Mars">Mars</Link>                       // a string read as <a href> reads it: relative to the location
<Link href={{ path: '/search', query: { q: text } }}>  // a change of the location: the values encoded
<NavLink href="/catalog" activeAsParent>Catalog</NavLink> // `active` on its address or under it
<NavLink href="/help" active={isHelpOpen}>Help</NavLink>   // or when told
<Link href="https://vk.com/faq">FAQ</Link>              // another site (a scheme or a host): a plain anchor
```

A click the browser handles stays the browser's: a modifier key (Cmd / Ctrl — a new tab, Shift — a new window), a
middle click, `target="_blank"`, `download` — `onClick` still hears it. An `href` with a scheme or a host
(`https://…`, `mailto:…`, `//cdn…`) leads outside the router's part: the browser follows it, and it is never taken for
a path of the app (nor marks a `NavLink`).

A `Link` re-renders only when its own target changes (an absolute `href` never does); a `NavLink` — only when its mark
flips.

## `useT`, `LocaleProvider`, `<Text>` — the locale's bindings

`localeViewProvider(React)` — see [`fundamentool/i18n`](../i18n/README.md#react--fundamentool-its-view-bindings): `useT(set)` re-renders a
component when its locale changes, and only then; `LocaleProvider` sets the locale of a part of the tree; `<Text>`
renders a message's tags by the app's renderers, or a message passed as data.

## `createDynamicComponents` — components in files of their own, declared where they're used

`dynamicComponentsProvider(React)` gives `createDynamicComponents(options)`: an app makes one instance, with its look for
a module on its way (`renderLoading`) and a failed one (`renderFailed({ error, retry })` — its message and Retry). A
module is declared in the file that uses it; its exports read as components, fetched (once, by `dynamicModule`) when
first rendered. Every declaration joins the instance's registry: `$state` — `{ total, loaded, failed }`, the total
readiness; `preload()` — every module declared, for a boot step.

```tsx
export const wgDynamicComponents = createDynamicComponents({ renderFailed: ({ retry }) => <PartFailed onRetry={retry} /> });
// openWindowShop/index.tsx
const dynamicComponents = wgDynamicComponents(() => import('./ShopContent'));
openWindowOverlay({ title, content: dynamicComponents.ShopContent });
// boot
wgDynamicComponents.$state.watch(({ total, loaded }) => report(total ? loaded / total : 1));
await wgDynamicComponents.preload();
```

## Files

| File | What's in it |
|------|--------------|
| `library.ts` | `TViewLibrary`, `VIEW_LIBRARY_KEYS`, `viewLibraryShape` (the library as a schema shape, `fundamentool/schema`) |
| `viewHooksProvider.ts` | `useUnit`, `useStoreMap` |
| `linksProvider.ts` | `Link`, `NavLink` |
| `localeViewProvider.ts` | `useT`, `useLocale`, `LocaleProvider`, `Text` — the locale's bindings (`fundamentool/i18n`) |
| `dynamicComponentsProvider.ts` | `createDynamicComponents` — components in files of their own, a registry of them (web-games D-098) |
