# View bindings: hooks that read stores, links for any router, a frame loop

[Русская версия](./README.ru.md)

## When you need it

- A React (or Preact) component that re-renders when a store changes — `useUnit`, as effector-react's; only when its
  part changes — `useStoreMap`.
- Links for any router: a real `<a href>` (a new tab, copy the link) whose click goes through the router; a link
  marked active (`NavLink`).
- A component that re-renders when the locale changes (`useT` — see `fundamentool/i18n`).
- Something that moves every frame — a spin, a flight, a sprite — stopped by a state and by an event, never jumping
  after a pause or a hidden tab (`useAnimationFrame`).

fundamentool's view code is built over a **React-like library the app passes in** (`TViewLibrary`: React, Preact
`compat`; later fundamentool's own) — fundamentool D-048, D-049. A provider per utility:

```ts
const LIBRARY = {
  createElement: React.createElement, forwardRef: React.forwardRef, useSyncExternalStore: React.useSyncExternalStore,
  useEffect: React.useEffect, useState: React.useState, useRef: React.useRef,
  createContext: React.createContext, useContext: React.useContext,
};
export const { useUnit, useStoreMap } = viewHooksProvider(LIBRARY);   // once, in the app's deps
export const { Link, NavLink } = linksProvider({ router, ...LIBRARY });
export const { useAnimationFrame } = animationFrameProvider(LIBRARY);
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

## `useAnimationFrame` — a frame loop in a component

`animationFrameProvider({ useRef, useEffect })` gives `useAnimationFrame(callback, options?)`: `createAnimationFrame`'s
loop ([`src/browser/`](../browser/README.md)) for a component — `callback(delta, time)` every frame, `delta` 0 on the
first frame after every start, a frame longer than `maxDelta` (250 ms: a hidden tab, a stall) skipped, or counted as
`maxDelta` with `clamp: true`. `time` is the sum of the deltas given and continues across every stop. The callback of
the latest render is called — no `deps`. Unmount cancels the frame asked for.

Two ways to stop it, kept apart: a **state** — `active` (default `true`), written in the render; an **event** —
`pause()` from a handler or from inside the callback. The loop runs while both allow it. It returns `TPlayback`,
`[play, pause, isPlaying]` — the same tuple on every render.

```tsx
export const { useAnimationFrame } = animationFrameProvider(LIBRARY);   // once, in the app's deps

// stops while a window covers it, or the player asked for reduced motion; goes on from the same angle
useAnimationFrame((delta) => api.rotate({ y: delta * 0.24 }), { active: !reduced && !dialogOpen });

// ends itself: no render needed
const [, pause] = useAnimationFrame((delta) => {
  position = Math.min(position + delta * 0.5, target);
  if (position === target) {
    pause();
  }
});

// a pause button; a coin that spins only under the pointer
const [play, pause, isPlaying] = useAnimationFrame(tick);
<button onClick={() => (isPlaying() ? pause() : play())} />
const [spin, still] = useAnimationFrame(turn, { autoplay: false });
<div onPointerEnter={spin} onPointerLeave={still} />

// a sprite at 12 pictures a second on any screen: one call per ~83 ms gathered
useAnimationFrame(() => sprite.next(), { interval: 1000 / 12 });
```

- Options: `active` (true), `autoplay` (true; `false` — still until `play()`), and the loop's `interval` (0), `maxDelta`
  (250), `clamp` (false), `frame`. A change of the loop's options restarts it; its clock goes on.
- `isPlaying()` — whether frames come now: `false` after `pause()`, and while `active` is `false` even after `play()`;
  `play()` then marks the wish, and the loop starts when `active` turns true.
- Reduced motion is the caller's to read (it knows a decorative spin from a progress bar): pass it into `active`.
- The options are checked at mount, in development; an unknown key or a bad value throws.

## `useT`, `LocaleProvider`, `<Text>` — the locale's bindings

`localeViewProvider(React)` — see [`fundamentool/i18n`](../i18n/README.md#react--fundamentool-its-view-bindings): `useT(set)` re-renders a
component when its locale changes, and only then; `LocaleProvider` sets the locale of a part of the tree; `<Text>`
renders a message's tags by the app's renderers, or a message passed as data.

## `dynamicLoaderProvider` — parts in files of their own, declared where they're used

`dynamicLoaderProvider(React, options)` is one call per app; it returns the loader itself, with the app's look for a
part on its way (`renderLoading`) and a failed one (`renderFailed({ error, retry })` — its message and Retry, in its own
texts). `module(load)` declares a module where it's used — lazy, nothing fetched yet; `component(module, (m) => m.X)`
picks a component out of it, fetched (once, by `dynamicModule`) when first shown. The loader's registry: `$state` —
`{ total, loaded, failed }` (`failed` — the modules that failed), `preload()` — every module, for a boot step,
`retry()` — the failed ones again.

```tsx
export const {
  module: wgDynamicModule,
  component: wgDynamicComponent,
  $state: $wgDynamicState,
  preload: wgDynamicPreload,
  retry: wgDynamicRetry,
} = dynamicLoaderProvider(React, { renderFailed: ({ retry }) => <PartFailed onRetry={retry} /> });
// openWindowShop/index.tsx
const shopModule = wgDynamicModule(() => import('./ShopContent'));
const ShopContent = wgDynamicComponent(shopModule, (m) => m.ShopContent);
// boot: the total readiness as the progress; what failed — retried
$wgDynamicState.watch(({ total, loaded }) => report(total ? loaded / total : 1));
await wgDynamicPreload().catch(() => wgDynamicRetry());
```

## Files

| File | What's in it |
|------|--------------|
| `library.ts` | `TViewLibrary`, `VIEW_LIBRARY_KEYS`, `viewLibraryShape` (the library as a schema shape, `fundamentool/schema`) |
| `viewHooksProvider.ts` | `useUnit`, `useStoreMap` |
| `linksProvider.ts` | `Link`, `NavLink` |
| `animationFrameProvider.ts` | `useAnimationFrame`, `TPlayback` — a frame loop in a component, over `createAnimationFrame` |
| `localeViewProvider.ts` | `useT`, `useLocale`, `LocaleProvider`, `Text` — the locale's bindings (`fundamentool/i18n`) |
| `dynamicLoaderProvider.ts` | `dynamicLoaderProvider` — parts in files of their own: `module`, `component`, the registry (web-games D-100) |
