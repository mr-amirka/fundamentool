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
```

A `Link` re-renders only when its own target changes (an absolute `href` never does); a `NavLink` — only when its mark
flips.

## Files

| File | What's in it |
|------|--------------|
| `library.ts` | `TViewLibrary`, `VIEW_LIBRARY_KEYS`, `assertViewLibrary` |
| `viewHooksProvider.ts` | `useUnit`, `useStoreMap` |
| `linksProvider.ts` | `Link`, `NavLink` |
