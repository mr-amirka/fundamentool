# browser

> [English version](README.md)

Browser-специфичные утилиты: DOM, WebSocket, изображения, хранилища, маршрутизация.

```ts
import * as browser from 'fundamentool/browser';
import { wsConnect, cookieStorageProvider } from 'fundamentool/browser';
```

---

## Детекция окружения

| Функция | Описание |
|---------|----------|
| `detection(ua)` | Разбирает строку `userAgent` в набор токенов (например, `'chrome chrome-100'`) |
| `detectionByWindow(win)` | Детектирует браузер и платформу по объекту `window` |

---

## DOM / навигация

| Функция | Описание |
|---------|----------|
| `ready(win)` | Возвращает хелпер `DOM ready` для переданного `window` |
| `openLink(url, target?)` | Открывает ссылку в новой вкладке |
| `download(url, filename)` | Скачивает файл по ссылке |
| `getDataLink(blob, type?)` | Создаёт blob-ссылку для скачивания |
| `runFrame(fn, interval?)` | Цикл на `requestAnimationFrame` с интервалом |

---

## Загрузка скриптов

| Функция | Описание |
|---------|----------|
| `script(url)` | Загружает `<script>` по URL, возвращает Promise |
| `dynamicModule(factory)` | Ленивая и кэширующая инициализация модуля |
| `dynamic(url)` | Загружает внешний скрипт с кэшем по URL |

---

## WebSocket

| Функция | Описание |
|---------|----------|
| `wsConnect(url)` | Подключается к WebSocket, возвращает Promise с открытым соединением |
| `wsAsyncRequestProvider(ws, opts)` | Асинхронные idempotent-запросы поверх WebSocket |
| `wsSeriesRequestProvider(ws, opts)` | Последовательные запросы по одному соединению |

```ts
const ws = await wsConnect('wss://example.com/ws');
ws.send(JSON.stringify({ type: 'ping' }));
```

---

## Изображения и Canvas

| Функция | Описание |
|---------|----------|
| `getImageByUrl(url)` | Загружает картинку и возвращает `HTMLImageElement` |
| `getImageNaturalSizeByUrl(url)` | Возвращает натуральный размер картинки `[w, h]` |
| `getBase64Image(img, type?)` | Конвертирует картинку в dataURL через canvas |

---

## Blob / base64

| Функция | Описание |
|---------|----------|
| `convertBlobToBase64(blob)` | Читает `Blob` как base64-строку |
| `convertUrlToBlob(url)` | Загружает URL в `Blob` |
| `convertUrlToBase64(url)` | URL → `Blob` → base64 |

---

## Хранилища (DI-паттерн)

Принимают `window` как параметр — платформозависимый объект инжектируется снаружи.

| Функция | Описание |
|---------|----------|
| `cookieStorageProvider(win)` | Реактивное хранилище на основе `document.cookie` |
| `localStorageProvider(win)` | Реактивное хранилище на основе `localStorage` |

```ts
const cookies = cookieStorageProvider(window);
cookies.set('token', 'abc123');
cookies.get('token'); // 'abc123'
```

---

## Стили и размеры

| Функция | Описание |
|---------|----------|
| `setStyleSheet(node, text, doc)` | Устанавливает CSS-текст для `<style>`-элемента |
| `stylesRenderProvider(doc, prefix)` | Управляет набором `<style>`-элементов в документе |
| `getViewportSizeProvider(win)` | Возвращает функцию, отдающую размер вьюпорта `[w, h]` |
| `createAnimationFrame(fn, interval?)` | Цикл на `requestAnimationFrame` с балансировкой интервала |

---

## Маршрутизация

| Функция | Описание |
|---------|----------|
| `routerProvider(win, store, opts)` | SPA-роутер на основе History API, интегрированный со `store` |
| `readyProvider(win)` | Хелпер для выполнения функций после `DOMContentLoaded` |
