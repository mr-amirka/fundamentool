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
`go(delta)`, `watch((entry, from) => …)` (переход, сделанный игроком, — где история теперь и где была; при подписке
ничего: переход — событие), `href(location)` (что покажет адресная строка). Прочитанная запись даёт `location`, `data` и
`index` — своё место в истории.

- **Вложенные области**: шаг в части сохраняет внешние части и очищает внутренние в этой записи; Назад / Вперёд
  восстанавливают запись целиком.
- **Одна история**: каждая запись знает своё место (`index`). Назад игрока, перескочивший записи (Chrome пропускает
  записи, сделанные без жеста пользователя), приводит на одну запись назад. Hash, набранный игроком (или простой
  `#якорь`), — следующая запись.
- **Несколько роутеров сразу** (D-039): роутер на часть; навигатор на одной части ходит к своим записям **по их местам**
  (`entry.historyIndex`), а не счётом — между ними лежат шаги другого роутера на внутренней части (шаги фильтра страницы
  в собственном состоянии записи), и Назад к записи сохраняет её собственные внутренние шаги (C8, D-049).
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
  `nav.startOver(location)` — всё прежнее уходит (списком — вся история одним шагом, ниже).
- **Чтение стека**: `nav.getHistory()` (записи снизу вверх), `nav.getPrevLocation()` (что покажет Назад),
  `nav.getNextLocation()` (что вернёт Вперёд), `nav.$depth` (глубина, наблюдаемая — `nav.$depth.watch((depth) => …)`),
  `nav.$state` / `nav.getState()` / `nav.useNavigatorState()` (всё, перерисовка при любом изменении) — с выборкой только
  выбранное: `nav.useNavigatorState((state) => state.section)` перерисует панель вкладок только при смене вкладки (D-049;
  это `useStoreMap` fundamentool, `src/view`).
- **Подтверждения и обработчики**: `nav.onBeforeLeave`, `nav.onForward`, `nav.whileOpen` и хуки `useBeforeLeave`,
  `useOnForward`, `useWhileOpen`. Хук принадлежит странице, на которой вызван (вне хоста — верхней; хуки фактов
  `useConfirmingLeave` / `useConfirmingLeaveEffect` следуют за той записью, что сверху сейчас, — отметка в шапке остаётся
  верной); id он не берёт.
  **Уход подтверждается** (`entry.confirmingLeave`, D-047) — пока спрашивают подтверждения ухода со страницы, её могут
  покинуть, а могут и остаться:

  ```tsx
  const confirming = nav.useConfirmingLeave();   // перерисовывает, только когда значение меняется
  nav.useConfirmingLeaveEffect(() => {           // без перерисовки
    video.pause();
    return () => video.play();                   // подтверждение кончилось: игрок остался (или страницы уже нет)
  });
  nav.isConfirmingLeave(entryId);                // вне компонентов
  nav.watchConfirmingLeave(entryId, (confirming) => …);
  ```

  **Подтверждения ухода как факт** (`entry.leaveGuarded`, D-049) — у записи есть подтверждение: уход с неё спросит.
  Регистрируйте подтверждение, только пока есть что терять, и факт значит «не сохранено»:

  ```tsx
  nav.useBeforeLeave(dirty ? () => confirmDiscard() : null);  // null — подтверждения нет
  const unsaved = nav.useLeaveGuarded();                       // эта страница (вне хоста — запись сверху)
  nav.useLeaveGuardedEffect(() => {                            // VK: свайп назад не может ждать вопроса
    bridge.send('VKWebAppSetSwipeSettings', { history: false });
    return () => bridge.send('VKWebAppSetSwipeSettings', { history: true });
  });
  attachEvent(window, 'beforeunload', (event) => nav.isAnyLeaveGuarded() && event.preventDefault()); // всё приложение
  nav.isLeaveGuarded(entryId); nav.watchLeaveGuarded(entryId, (guarded) => …);
  nav.watchAnyLeaveGuarded((guarded) => …); nav.useAnyLeaveGuarded();
  ```

  `watch…` фактов состояния (`watchConfirmingLeave`, `watchLeaveGuarded`, `watchAnyLeaveGuarded`) срабатывает сразу со
  значением, затем при каждой смене (D-049). `nav.useEntry()` — запись целиком; перерисовывает при любом её изменении,
  каждый шаг страницы тоже: для одного факта лучше свой хук. Хост передаёт вниз id страницы, поэтому хуки под страницей
  не перерисовываются на её шагах.
- **Ссылки**: `nav.Link` / `nav.NavLink` — это `linksProvider` fundamentool (`src/view` — ссылки для любого роутера, с
  навигатором и без) плюс разделы: `href` — строкой, как её читает `<a href>` (`/x`, `?q=1`, `42`), или изменением
  (`{ path, query }`, закодировано); со схемой или хостом (`https://…`, `mailto:…`) — чужой сайт, обычная ссылка. Клик
  с клавишей-модификатором (новая вкладка), `target="_blank"` или `download` — браузера. `NavLink` активна на своём
  адресе, под ним (`activeAsParent`), когда так сказано
  (`active`) или пока показан раздел, куда она ведёт; каждая перерисовывается, только когда меняется её цель или
  отметка.

Тестовое приложение на пять вкладок, где это используется: web-games `frontend/labs/navigation` (приход по ссылке —
юнит-тесты, `tests/router/navigator.arriving.test.ts`).

## Приход по ссылке (D-050)

Ссылка в чате, push-уведомление, ссылка ВК на мини-приложение: пользователь попадает на страницу снаружи — а какие-то
страницы должны быть первыми (онбординг, вход).

**Глубокая ссылка ложится поверх дома.** Первый заход на страницу, отличную от `fallback`, кладёт `fallback` под неё (с
разделами — корень стартового раздела): любой Назад — приложения, браузера, Android — ведёт домой, а не из приложения.
Страница под ней ждёт спящей (не рисуется, пока до неё не дошли).

```ts
createNavigator({ router, …, fallback: { path: '/' } });
// открыли #/place/5  →  история [ /  ·  /place/5 ← показана ]  →  Назад → /
```

**Адрес снаружи открывается поверх показанной страницы** — набранный адрес, обычная `<a href="#/route/7">` в HTML
статьи, то, что сообщает платформа (`VKWebAppChangeFragment` ВК). Шаг как любой другой: Назад возвращает туда, где
пользователь был.

```ts
bridge.subscribe(({ detail }) => {
  if (detail.type === 'VKWebAppChangeFragment' && detail.data?.location) {
    router.pushLocation(urlParse(detail.data.location));
  }
});
// [ / · /place/5 ]  — пришла ссылка на /route/7  →  [ / · /place/5 · /route/7 ]  →  Назад → /place/5
```

**Вся история одним шагом** — `nav.startOver(location | locations, { quiet })`: все страницы и окна уходят; список
пишется снизу вверх, каждый адрес читается от предыдущего; показан только последний, остальные ждут спящими. Корень
раздела может быть только первым (он задаёт раздел).

```ts
await nav.startOver({ path: '/signin' });                   // выход из аккаунта
await nav.startOver([{ path: '/' }, { path: '/place/5' }]); // [ / · /place/5 ] — дом не показывался
```

Записи впереди одной страницы, записанной на месте, браузер сохраняет (их убирает только новая запись): его Вперёд
может вернуть прежние страницы — пока ворота закрыты, они их задерживают.

**Охрана входа** — `nav.onBeforeEnter(({ location, row, params }) => …)` спрашивается, прежде чем адрес будет показан: шаг, ссылка, вкладка,
`startOver`, `fallback`, адрес снаружи, страница из адреса при старте (не Назад и Вперёд по страницам, что уже в стеке).
`true` — открыть; адрес — открыть его вместо (спрашивается снова); `false` — не открывать: пользователь остаётся (при
старте — `fallback`). Синхронно: старт решается до первой отрисовки.

```ts
// закрытый уровень не рисуется вовсе — нажатие ничего не делает; `params` — строки, раскодированные ('/level/:levelId')
nav.onBeforeEnter(({ params }) => params.levelId === undefined || progress.isUnlocked(params.levelId));
// старый адрес — на новое место
nav.onBeforeEnter(({ location }) => (location.path === '/old-shop' ? { path: '/shop' } : true));
```

**Ворота** — страницы, которые должны быть первыми. Пока ворота закрыты, показываются только их страницы; любой
другой адрес **задерживается** и показывается, когда они откроются, — поверх `fallback`, по пути ничего не мелькает.

```tsx
// deps.ts
export const nav = createNavigator({
  router, …,
  fallback: { path: '/' },
  gates: {
    signIn: { closed: $signedOut, to: { path: '/signin' } },               // проходятся первыми
    onboarding: { closed: $needsOnboarding, to: { path: '/onboarding' } },
  },
});
// navigation.tsx — страницы ворот
['/signin', { main: SignIn, gate: 'signIn' }],
['/onboarding', { main: Onboarding, gate: 'onboarding' }],
['/onboarding/:step', { main: Onboarding, gate: 'onboarding' }],
// Onboarding.tsx — обычные шаги, ничего не переносится
<nav.Link href={`/onboarding/${step + 1}`}>Далее</nav.Link>
await saveOnboardingPassed(); // $needsOnboarding → false: остальное делает навигатор
```

Пользователь нажал ссылку на `/place/5` и ещё не прошёл онбординг:

| Момент | История | На экране |
|--------|---------|-----------|
| приложение открылось на `/place/5` | `[ /onboarding ]` | онбординг — `/place/5` задержан, не рисовался |
| Далее, Далее | `[ /onboarding · /onboarding/2 · /onboarding/3 ]` | шаги |
| пришла ссылка на `/route/7` | без изменений | шаг остаётся; задержан теперь `/route/7` (новейший побеждает) |
| перезагрузка | как была | задержанная ссылка сохранилась |
| `$needsOnboarding` → `false` | `[ / · /route/7 ]` | `/route/7`; дом не показывался; Назад → `/` |

- Проходятся первые закрытые по порядку ворота; задержанная ссылка переходит от ворот к воротам (вход, затем
  онбординг).
- Ворота, закрывшиеся, пока показана другая страница, задерживают её: вышли из аккаунта на `/profile` → `/signin` →
  вошли → `[ / · /profile ]`. Стек, который возвращает история при закрытых воротах (Вперёд, перезагрузка), тоже
  задерживается.
- `state.held` — ждущая ссылка: `nav.useNavigatorState((state) => state.held)` («дальше — маршрут …»).
- Назад с первой страницы ворот уходит из приложения; `leavePage` там ничего не делает (`fallback` — за воротами).
- Страница ворот при открытых воротах — обычная страница (запретить — `onBeforeEnter`).

## Файлы

| Файл | Что в нём |
|------|-----------|
| `historyPrimitives.ts` | примитивы поверх истории браузера и поверх массива; вложенные части, единая история |
| `createRouter.ts` | роутер: адрес части, её шаги, `params` |
| `constants.ts` | имена частей и записей, значения по умолчанию |
| `options.ts` | ключи опций шагов и их проверка |
| `navigator.ts` | движок навигатора: стек, окна, вкладки, подтверждения, восстановление после перезагрузки |
| `navigatorState.ts` | состояние из стека: смонтированные страницы (`layers`), показанная вкладка |
| `navigatorView.ts` | хост, хуки, `Link` / `NavLink` навигатора (поверх `src/view`) |
| `routeTable.ts` | таблица маршрутов, сопоставленная с путём |
| `location.ts` | адрес, на который идёт шаг; `href` ссылки; что значит «под путём» |
| `types.ts` | типы |
