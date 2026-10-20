# Роутер: примитивы истории, роутеры, навигатор

[English version](./README.md)

Три слоя (fundamentool D-038, D-039):

```
browserHistoryPrimitivesProvider(window) → { url, hash, state }   одна история, три вложенные части каждой записи
createRouter({ historyPrimitive })                                одна часть: её адрес, её шаги, её `params`
createNavigator({ router, … })                                    страницы и окна поверх роутера
```

## Примитивы истории

Примитив — одна часть записи истории: адрес (путь + query) ⊃ его hash ⊃ собственное состояние записи; как браузер
ходит по истории, спрятано внутри: `current()`, `push(location, data)`, `replace(location, data)`, `go(delta)`,
`watch(listener)` (переход, сделанный игроком), `href(location)` (что покажет адресная строка).

- **Вложенные области**: шаг в части сохраняет внешние части и очищает внутренние в этой записи; Назад / Вперёд
  восстанавливают запись целиком.
- **Одна история**: каждая запись знает своё место. Назад игрока, перескочивший записи (Chrome пропускает записи,
  сделанные без жеста пользователя), приводит на одну запись назад.
- `browserHistoryPrimitivesProvider(window)` — одни и те же примитивы для одного окна.
  `memoryHistoryPrimitivesProvider(start)` — то же поверх массива (виджет, превью, тесты); `navigate(delta)` — переход
  игрока.

## Роутер — одна часть

```ts
const router = createRouter({
  historyPrimitive: browserHistoryPrimitivesProvider(window).hash,
  createObservable,
  createApi,
});
router.$location; router.$path; router.$query;          // адрес части
await router.pushLocation({ path: '/level/2' });         // путь (или текущий) со своим query
await router.replaceLocation({ query: { tab: 'map' } });
await router.backLocation();
router.params.set('tab', 'map');                         // query как хранилище ключ-значение: новая запись…
router.params.set('scroll', 120, { replace: true });     // …или текущая
```

`params` — с интерфейсом `localStorageProvider` / `cookieStorageProvider` (`TKeyValueStorage`), порт для
`storeProvider`: `storeProvider(deps, router.params)` хранит сторы в адресе. Одна часть — один роутер.

## Навигатор — страницы и окна

```ts
// deps.ts — не импортирует страниц
export const nav = createNavigator({
  router, createObservable, createApi,
  createElement, forwardRef, Component, useEffect, useState, useRef, createContext, useContext, // React или Preact
});

// navigation.tsx — импортирует страницы: таблица маршрутов идёт в хост (без циклического импорта)
export const NavigationHost = nav.NavigationHostProvider({
  routes: [
    ['/', { main: Home, keep: true }],
    ['/level/:levelId', { main: Level }],
    ['/(.*)', { main: Home }],
  ],
  render: (row, route) => <Suspense fallback={null}><row.main route={route} /></Suspense>, // необязательно
});
```

- **Каждая страница и каждое окно — запись истории**: Назад (браузер, Android, Escape) закрывает верхнюю. Шаги роутера
  становятся страницами: `router.pushLocation` открывает страницу, `router.backLocation` закрывает верхнюю запись.
  `await nav.open(Window, params)` — результат, с которым окно закрылось (`null` — закрыто кнопкой Назад).
- **Вперёд работает**: что Назад оставил, остаётся впереди и возвращается (окно — заново, с теми же params);
  `nav.open(Confirm, params, { reopen: false })` — Вперёд останавливается перед ним (D-024).
- **Таблица маршрутов — единственное описание страниц**: `keep` строки (смонтирована, пока закрыта другими, не больше
  `keep`, по умолчанию 10) и `section` (строка с ним — корень этой вкладки) — навигатора; остальное — приложения, его
  рисует `render(row, route, entry)` (по умолчанию `<row.main route={route} />`, `route` — `{ params, location }`,
  params раскодированы). `renderMissing` — путь, которому не подошла ни одна строка; `renderWindow` — окно (по
  умолчанию `<entry.window {...props} />`).
- **Вкладки**: строки с `section` — у каждой вкладки своя история; `nav.switchSection(name)` по показанной вкладке
  возвращает её к корню; Назад с корня вкладки показывает первую вкладку; страница принадлежит вкладке, в которой
  открыта.
- **Перезагрузка** восстанавливает стек из истории: страницы под верхней — `dormant` (не смонтированы), пока до них не
  дойдут; записи окон проходятся (окно не открывается заново, D-011).
- **Ещё**: `nav.startOver(location)` (выход из аккаунта — всё прежнее уходит), `nav.leavePage({ fallback })`
  (страница без доступа: назад или `fallback` на её месте), `nav.switchSection`, `nav.backToSection`; подтверждения
  ухода и обработчики «вперёд» — `nav.onBeforeLeave`, `nav.onForward`, `nav.whileOpen` и хуки `useBeforeLeave`,
  `useOnForward`, `useWhileOpen`, `useEntry`, `useNavigatorState`; `nav.Link`, `nav.NavLink`.

Тестовое приложение на пять вкладок, где всё это используется: web-games `frontend/labs/navigation`.

## Файлы

| Файл | Что в нём |
|------|-----------|
| `historyPrimitives.ts` | примитивы поверх истории браузера и поверх массива; вложенные части, единая история |
| `createRouter.ts` | роутер: адрес части, её шаги, `params` |
| `navigator.ts` | движок навигатора: стек, окна, вкладки, подтверждения, восстановление после перезагрузки |
| `navigatorState.ts` | состояние из стека: смонтированные страницы (`layers`), показанная вкладка |
| `navigatorView.ts` | хост, хуки, `Link` / `NavLink` |
| `routeTable.ts` | таблица маршрутов, сопоставленная с путём |
| `location.ts` | адрес, на который идёт шаг |
| `types.ts` | типы |
