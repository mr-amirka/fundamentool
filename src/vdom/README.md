# vdom

> [Русская версия](README.ru.md)

> ⚠️ A trial (fundamentool D-072), `[draft]`. The name `fundamentool/vdom` is a working one.

fundamentool's own view library: React's API (elements, function components, hooks, contexts, portals, `createRoot`)
on a reconciler of its own. It weighs **5.6 KB gzip** for everything an app with MUI and emotion uses: React 19 is
67.6 KB, Preact with `preact/compat` is 8.2 KB. Libraries written for React (MUI, emotion, react-transition-group)
run on it unchanged: elements have React 19's shape and `$$typeof` symbols, and `ref` is a prop.

```ts
import { createElement as h, createRoot, useState } from 'fundamentool/vdom';

function Counter() {
  const [n, setN] = useState(0);
  return h('button', { onClick: () => setN(n + 1) }, n);
}

createRoot(document.getElementById('root')!).render(h(Counter));
```

## In an app instead of React

`fundamentool/vdom/react` stands in for React's five entries. The bundler and the test runner point them all there;
the app's code and its libraries stay as they are. It is the whole of `fundamentool/vdom` plus a default export, for
libraries that do `import React from 'react'` (MUI, emotion):

```ts
// vite.config.ts — an array of regular expressions: a key `react` would also catch `react/jsx-runtime`
const REACT_ENTRIES = [/^react$/, /^react-dom$/, /^react-dom\/client$/, /^react\/jsx-runtime$/, /^react\/jsx-dev-runtime$/];
export default defineConfig({
  resolve: {
    alias: REACT_ENTRIES.map((find) => ({ find, replacement: 'fundamentool/vdom/react' })),
  },
});
```

```js
// jest.config.cjs
module.exports = {
  moduleNameMapper: {
    '^react(-dom)?(/client|/jsx-runtime|/jsx-dev-runtime)?$': 'fundamentool/vdom/react',
  },
};
```

`@vitejs/plugin-react` isn't used: its Fast Refresh needs React itself. JSX is compiled by esbuild (`"jsx":
"react-jsx"` in `tsconfig.json`), and an edit reloads the page. Types stay `@types/react`.

## What's in it

| Member | As in React |
|--------|-------------|
| `createElement`, `jsx` / `jsxs` / `jsxDEV`, `cloneElement`, `isValidElement`, `Children` | the same results; `key` leaves the props, `ref` stays in them (React 19); `defaultProps` are applied |
| `Fragment`, `StrictMode` | `StrictMode` renders its children (React's development double-renders aren't done) |
| `memo`, `forwardRef` | `memo` compares props shallowly, or with your `compare` |
| `createContext`, `useContext` | the context is its own provider (`<Theme value>`); `Provider` and `Consumer` exist too |
| `createPortal`, `createRoot` | the first `render` clears the container |
| `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useId` | setting an equal value (`Object.is`) renders nothing |
| `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useImperativeHandle` | `useEffect` runs in the next task, or before the next render, whichever comes first |
| `useSyncExternalStore`, `useEffectEvent`, `useDebugValue` | `useDebugValue` does nothing (there are no developer tools) |
| `act` | for tests: renders what is queued and runs the effects; with async work, waits until no more work comes (it flushes, waits a task, looks again) |

## How it updates

- **Rendering.** A state change queues its component. The queue renders in a microtask, shallowest component first,
  so a parent and a child queued together render once each. The DOM is changed during the render, as Preact does.
- **Commit.** Layout effects and refs run after the DOM changes, children before parents. A state set inside a layout
  effect renders again before the browser paints.
- **Passive effects.** `useEffect` runs in a later task, every cleanup before every effect.

## How it handles the DOM

- **Children.** Children are matched by key, and by position when there's no key. Only nodes that moved are inserted
  again.
- **Props.** A prop is written as a DOM property when the node has one, otherwise as an attribute (Preact's rule,
  Preact's exceptions).
  - `className` becomes `class` and `htmlFor` becomes `for`.
  - In SVG, camelCase attributes become kebab-case.
  - Numeric styles get `px` unless the property is unitless.
- **Events.**
  - Each node listens directly for its own events; there is no event delegation.
  - `onChange` on a text field listens to `input`.
  - `onFocus` and `onBlur` listen to `focusin` and `focusout`, so they bubble as React's do.
  - `onClickCapture` listens in the capture phase.
  - A handler gets the DOM event, with `nativeEvent`, `persist()`, `isDefaultPrevented()` and
    `isPropagationStopped()` added.
- **Form fields.**
  - `value` and `checked` are set after the children, so a `<select>` has its options by then.
  - `defaultValue` and `defaultChecked` are set once, on mount.

## Not supported

- Class components (`Component`, `PureComponent`).
- `Suspense`, `lazy`, transitions (`useTransition`, `useDeferredValue`).
- Server rendering and hydration.
- React's development warnings.
