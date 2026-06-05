# browser

> [Русская версия](README.ru.md)

Browser-specific utilities: DOM, WebSocket, images, storage, routing.

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
| `runFrame(fn, interval?)` | `requestAnimationFrame` loop with an interval |

---

## Script loading

| Function | Description |
|----------|-------------|
| `script(url)` | Injects a `<script>` tag and returns a Promise |
| `dynamicModule(factory)` | Lazy, cached module initializer |
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
| `createAnimationFrame(fn, interval?)` | `requestAnimationFrame` loop with interval balancing |

---

## Routing

| Function | Description |
|----------|-------------|
| `routerProvider(win, store, opts)` | SPA router based on History API, integrated with `store` |
| `readyProvider(win)` | Helper for running functions after `DOMContentLoaded` |
