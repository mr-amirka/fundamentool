# browser

> [Русская версия](README.ru.md)

Browser-specific utilities: DOM, WebSocket, images, storage, routing.

## When you need it

- Tell the browser and the platform from the user agent.
- Wait for the DOM to be ready, open a link, download a file, run a function every animation frame.
- Load a script on demand; an image's natural size, an image or a blob as base64.
- Cookies and `localStorage` as reactive stores.
- Requests over a server's own WebSocket protocol — `{ id, method, data }` — with reconnect. Calls between your own
  client and server: [`fundamentool/rpc`](../rpc/README.md)'s `RpcClientWebSocket`.
- Style sheets in the document, the viewport's size; a single-page router over the History API.

```ts
import * as browser from 'fundamentool/browser';
import { wsConnect, cookieStorageProvider } from 'fundamentool/browser';
```

---

## Environment detection

| Function | Description |
|----------|-------------|
| `detection(ua)` | Parses a `userAgent` string into space-separated tokens (e.g. `'chrome chrome-100'`) |
| `detectionByWindow(win)` | Detects browser and platform from a `window` object |

---

## DOM / navigation

| Function | Description |
|----------|-------------|
| `ready(win)` | Returns a `DOM ready` helper for the given `window` |
| `openLink(url, target?)` | Opens a URL in a new tab |
| `download(url, filename)` | Triggers a file download |
| `getDataLink(blob, type?)` | Creates a blob URL for downloading |
| `createAnimationFrame(fn, options?)` | A frame loop: `fn(delta, time)` every frame, by the frames' own timestamps; the first frame gives `delta` 0, a frame longer than `maxDelta` (250 ms) gives 0 — or `maxDelta` with `clamp`; `interval` sums the frames until it is reached; `time` — where the clock starts; `frame: { request, cancel }` — where the frames come from (default the browser's). Returns its stop: cancels the frame asked for. The hook over it: `useAnimationFrame` ([`src/view/`](../view/README.md)) |
| `nextFrame(fn)` | Runs `fn` once on the next animation frame; returns a cancel function |

---

## Script loading

| Function | Description |
|----------|-------------|
| `script(url)` | Injects a `<script>` tag and returns a Promise |
| `dynamic(url)` | Loads an external script with URL-based caching |

---

## WebSocket

| Function | Description |
|----------|-------------|
| `wsConnect(url)` | Connects to a WebSocket and resolves with the open socket |
| `wsAsyncRequestProvider(ws, opts)` | Async idempotent requests over WebSocket |
| `wsSeriesRequestProvider(ws, opts)` | Sequential requests over a single connection |

```ts
const ws = await wsConnect('wss://example.com/ws');
ws.send(JSON.stringify({ type: 'ping' }));
```

---

## Images and Canvas

| Function | Description |
|----------|-------------|
| `getImageByUrl(url)` | Loads an image and returns `HTMLImageElement` |
| `getImageNaturalSizeByUrl(url)` | Returns natural image size `[w, h]` |
| `getBase64Image(img, type?)` | Converts an image to a dataURL via canvas |

---

## Blob / base64

| Function | Description |
|----------|-------------|
| `convertBlobToBase64(blob)` | Reads a `Blob` as a base64 string |
| `convertUrlToBlob(url)` | Fetches a URL into a `Blob` |
| `convertUrlToBase64(url)` | URL → `Blob` → base64 |

---

## Storage (DI pattern)

These functions accept `window` as a parameter — the platform-specific object is injected from outside.

| Function | Description |
|----------|-------------|
| `cookieStorageProvider(win)` | Reactive store backed by `document.cookie` |
| `localStorageProvider(win)` | Reactive store backed by `localStorage` |

```ts
const cookies = cookieStorageProvider(window);
cookies.set('token', 'abc123');
cookies.get('token'); // 'abc123'
```

---

## Styles and dimensions

| Function | Description |
|----------|-------------|
| `setStyleSheet(node, text, doc)` | Sets CSS text on a `<style>` element |
| `stylesRenderProvider(doc, prefix)` | Manages a set of `<style>` elements in the document |
| `getViewportSizeProvider(win)` | Returns a function that returns viewport size `[w, h]` |

---

## Routing

| Function | Description |
|----------|-------------|
| `routerProvider(win, store, opts)` | SPA router based on History API, integrated with `store` |
| `readyProvider(win)` | Helper for running functions after `DOMContentLoaded` |
