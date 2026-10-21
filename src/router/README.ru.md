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
ходит по истории, спрятано внутри: `current()`, `push(location, data)`, `replace(location, data)`, `canGo(delta)`,
`go(delta)`, `watch(listener)` (переход, сделанный игроком), `href(location)` (что покажет адресная строка).

- **Вложенные области**: шаг в части сохраняет внешние части и очищает внутренние в этой записи; Назад / Вперёд
  восстанавливают запись целиком.
- **Одна история**: каждая запись знает своё место. Назад игрока, перескочивший записи (Chrome пропускает записи,
  сделанные без жеста пользователя), приводит на одну запись назад. Hash, набранный игроком (или простой `#якорь`), —
  следующая запись.
- **Края**: `canGo(delta)` — остаётся ли переход в истории (не раньше первой записи — там чужой сайт; не дальше
  последней известной — записи впереди, сделанные до перезагрузки, считаются, когда их увидели); переход, который он
  не разрешает, не делается, `go` завершается сразу.
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

// Перейти — путь (или текущий) со своим query (не указанный query очищается)
await router.pushLocation({ path: '/level/2' });
await router.replaceLocation({ query: { tab: 'map' } });
// Изменить часть, остальное оставить — query сливается, ключ со значением undefined удаляется
await router.extendLocation({ query: { page: 2 } });
await router.extendLocation({ query: { page: undefined } }, { replace: true });

// Назад — без аргументов, сразу обработчик
button.onclick = router.backLocation;
await router.backRepeat(3, { force: true });             // 3 шага за один переход, не спрашивая подтверждений

// С защитой от двойного нажатия — вызов, пока идёт прошлый или 300 мс от его начала, пропускается
card.onclick = () => router.pushLocationThrottled({ path: '/item/7' });
back.onclick = router.backLocationThrottled;

// query как хранилище ключ-значение
router.params.set('tab', 'map');                         // новая запись…
router.params.set('scroll', 120, { replace: true });     // …или текущая
router.params.assign({ sort: 'price', page: 2 });        // несколько ключей одной записью
```

**Что показано и где история** (D-045). `$location` / `$path` / `$query`, `getLocation()` и `params` — **то, что
показано**, за ним следят страницы. `$actualLocation` / `$actualPath` / `$actualQuery`, `getActualLocation()` и
`actualParams` — **где история на самом деле**. Расходятся, только пока есть тихие шаги.

```ts
await router.pushLocation({ path: '/wizard/3', query: { draft: 1 } }, { quiet: true });
router.$path.getState();          // '/home' — показано
router.$actualPath.getState();    // '/wizard/3'
router.actualParams.get('draft'); // 1
```

**Откуда пришли**: `getFromLocation()` / `$fromLocation` — адрес, показанный до последней смены, в любую сторону
(`null` до первой): `from` в аналитике, какой пункт списка подсветить после «Назад».

```ts
sendEvent(name, { screen: router.getLocation().path, from: router.getFromLocation()?.path });
```

**Тихие шаги** — `{ quiet: true }` у `pushLocation`, `replaceLocation`, `extendLocation`, `backRepeat`, `params.set /
assign / remove / clear`, `nav.backToDepth`: история (и стек навигатора) меняется, ничего не показывается — страницы и
хуки увидят это на следующем не тихом шаге; страницы, открытые тихо, не монтируются, пока их не покажут. Домашняя
страница под глубокой ссылкой, прыжок мастера через несколько шагов (каждый — запись истории, показан только
последний), выход из онбординга.

`params` / `actualParams` — с интерфейсом `localStorageProvider` / `cookieStorageProvider` (`TKeyValueStorage`: `get`,
`set`, `assign`, `remove`, `getKeys`, `clear`, `watch`), порт для `storeProvider`: `storeProvider(deps, router.params)`
хранит сторы в адресе. Читают query, каким его записали последним; об изменённом ключе сообщают, когда адрес (показанный
/ настоящий) его получил. Одна часть — один роутер. `backLocation()` на первой записи истории возвращает `false` (шаг
назад оттуда ушёл бы из приложения) — или, с `fallback` навигатора, идёт туда.

Устройство роутера открыто: `router.historyPrimitive` (его часть) и `router.attach(driver)` (навигатор — или свой
драйвер — забирает его шаги; один на роутер).

## Навигатор — страницы и окна

```ts
// deps.ts — не импортирует страниц
export const nav = createNavigator({
  router, createObservable, createApi,
  createElement, forwardRef, useEffect, useState, useRef, createContext, useContext, // React или Preact
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
- **Шаг показанной страницы — та же страница** (D-043): шаг на ту же строку (`/wizard/1` → `/wizard/2`, смена query) —
  новая запись истории, но страница остаётся смонтированной и получает новый `route`; Назад возвращает прежний. Её
  подтверждения ухода спрашиваются, когда её покидают, а не на её собственных шагах; обработчики «вперёд» — когда поверх
  открывается другое. Строку с `quietQuery: true` при смене одного query даже не перерисовывают: её части следят за
  query через `router.params` (`storeProvider(deps, router.params)`).
- **Вперёд работает**: что Назад оставил, остаётся впереди и возвращается (окно — заново, с теми же params);
  `nav.open(Confirm, params, { reopen: false })` — Вперёд останавливается перед ним (D-024).
- **Таблица маршрутов — единственное описание страниц**: `keep` строки (смонтирована, пока закрыта другими, не больше
  `keep`, по умолчанию 10), `section` и `quietQuery` — навигатора; остальное — приложения, его
  рисует `render(row, route, entry)` (по умолчанию `<row.main route={route} />`, `route` — `{ params, location }`,
  params раскодированы). Путь, которому не подошла ни одна строка, ничего не рисует — «не найдено» — это последняя
  строка на всё (`/(.*)`); `renderWindow` — окно (по умолчанию `<entry.window {...props} />`). Новый хост даёт новую
  таблицу (горячая перезагрузка); два хоста, смонтированные одновременно, рисуют одни и те же страницы.
- **Разделы (вкладки)**: строка с `section: true` — корень раздела (первый — стартовый раздел, его шаблон без
  параметров); у каждого раздела своя история. Вкладка — ссылка на его корень: из другого раздела — раздел, каким его
  оставили (адрес ссылки не применяется); первый визит — корень по адресу ссылки; в том же разделе — назад к его началу,
  а если адрес ссылки другой, начало его получает. Назад с начала раздела показывает стартовый раздел; страница
  принадлежит разделу, в котором открыта; `state.section` — шаблон корня показанного раздела.
  `nav.backToRoot()` — назад к началу раздела (без разделов — к первой странице).
- **Перезагрузка** восстанавливает стек из истории: страницы под верхней — `dormant` (не смонтированы), пока до них не
  дойдут; записи окон проходятся (окно не открывается заново, D-011).
- **Назад**: `router.backLocation()`, `nav.leavePage()` (назад на страницу — окна над ней тоже закрываются — или, на
  первой странице, `fallback` навигатора на её месте, D-044) и `nav.backToRoot()` (начало раздела) — без аргументов:
  `onClick={nav.leavePage}`; с опциями — `router.backRepeat(count, { force, quiet })` и
  `nav.backToDepth(depth, { force, quiet })` (`0` — самая первая страница: выход из аккаунта).
  `nav.startOver(location)` — всё прежнее уходит.
- **Чтение стека**: `nav.getHistory()` (записи снизу вверх), `nav.getPrevLocation()` (что покажет Назад),
  `nav.getNextLocation()` (что вернёт Вперёд), `nav.$depth` (глубина, наблюдаемая — `nav.$depth.watch((depth) => …)`),
  `nav.$state` / `nav.getState()` / `nav.useNavigatorState()` (всё).
- **Подтверждения и обработчики**: `nav.onBeforeLeave`, `nav.onForward`, `nav.whileOpen` и хуки `useBeforeLeave`,
  `useOnForward`, `useWhileOpen`, `useEntry`; запись `closing`, пока спрашивают её подтверждения ухода
  (`<Button disabled={nav.useEntry().closing}>`).
- **Ссылки**: `nav.Link` / `nav.NavLink` с `href` — строкой, как её читает `<a href>` (`/x`, `?q=1`, `42`), или
  изменением (`{ path, query }`, закодировано); `NavLink` активна на своём адресе, под ним (`activeAsParent`) или пока
  показан раздел, куда она ведёт.

Тестовое приложение на пять вкладок, где всё это используется: web-games `frontend/labs/navigation`.

## Файлы

| Файл | Что в нём |
|------|-----------|
| `historyPrimitives.ts` | примитивы поверх истории браузера и поверх массива; вложенные части, единая история |
| `createRouter.ts` | роутер: адрес части, её шаги, `params` |
| `constants.ts` | имена частей и записей, значения по умолчанию |
| `options.ts` | ключи опций шагов и их проверка |
| `navigator.ts` | движок навигатора: стек, окна, вкладки, подтверждения, восстановление после перезагрузки |
| `navigatorState.ts` | состояние из стека: смонтированные страницы (`layers`), показанная вкладка |
| `navigatorView.ts` | хост, хуки, `Link` / `NavLink` |
| `routeTable.ts` | таблица маршрутов, сопоставленная с путём |
| `location.ts` | адрес, на который идёт шаг; `href` ссылки; что значит «под путём» |
| `types.ts` | типы |
