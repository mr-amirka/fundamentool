# Привязки к виду: хуки, читающие сторы, ссылки для любого роутера, цикл кадров

[English version](./README.md)

## Когда нужен

- Компонент React (или Preact), который перерисовывается при изменении стора, — `useUnit`, как в effector-react;
  только при изменении своей части — `useStoreMap`.
- Ссылки для любого роутера: настоящий `<a href>` (новая вкладка, копирование ссылки), чей клик идёт через роутер;
  активная ссылка (`NavLink`).
- Компонент, который перерисовывается при смене локали (`useT` — см. `fundamentool/i18n`).
- Что-то, что движется каждый кадр — вращение, полёт, спрайт, — останавливается состоянием и событием и никогда не
  прыгает после паузы или скрытой вкладки (`useAnimationFrame`).

Код вида в fundamentool строится поверх **React-подобной библиотеки, которую передаёт приложение** (`TViewLibrary`:
React, Preact `compat`; позже — своя в fundamentool) — fundamentool D-048, D-049. По провайдеру на утилиту:

```ts
const LIBRARY = {
  createElement: React.createElement, forwardRef: React.forwardRef, useSyncExternalStore: React.useSyncExternalStore,
  useEffect: React.useEffect, useState: React.useState, useRef: React.useRef,
  createContext: React.createContext, useContext: React.useContext,
};
export const { useUnit, useStoreMap } = viewHooksProvider(LIBRARY);   // один раз, в зависимостях приложения
export const { Link, NavLink } = linksProvider({ router, ...LIBRARY });
export const { useAnimationFrame } = animationFrameProvider(LIBRARY);
```

## `useUnit`, `useStoreMap` — имена и формы effector-react

Читают любой стор с `getState` + `watch` — fundamentool (`createObservable`, `$location` роутера, `$state` навигатора)
и effector одинаково, так что перевод приложения между ними меняет импорт, а не код. Построены на `useSyncExternalStore`
библиотеки: ни одно изменение между рендером и подпиской не теряется.

```tsx
const path = useUnit(router.$path);                                  // значение; перерисовка, когда оно меняется
const [level, moves] = useUnit([$level, $moves]);                    // список
const { coins, spend } = useUnit({ coins: $coins, spend: spendCoins }); // форма; событие возвращается как есть

// Часть большого стора — перерисовка, только когда меняется эта часть
const section = useStoreMap(nav.$state, (state) => state.section);
// Полная форма: `keys` — от чего ещё, кроме состояния, зависит `fn`; `updateFilter`, `defaultValue`
const confirming = useStoreMap({
  store: nav.$state,
  keys: [entryId],
  fn: (state, [id]) => state.entries.some((entry) => entry.id === id && entry.confirmingLeave),
});
```

- Длина списка и ключи формы от рендера к рендеру не меняются (как у effector).
- Не пишите `useUnit($store.map(fn))` для выборки: это `useStoreMap($store, fn)`. (Брошенный `map` ничего не держит —
  D-049, — но вычисляется заново на каждом рендере.)

## `Link`, `NavLink` — для любого роутера

Настоящий `<a href>` (новая вкладка, копировать ссылку, средний клик); клик — шаг через роутер, по одному клику за раз
на все ссылки (двойное касание — один шаг). У роутера без навигатора (одноэкранное приложение, хранящее настройки в
адресе) ссылки тоже есть; `nav.Link` / `nav.NavLink` навигатора — это они плюс его разделы.

```tsx
<Link href="?n=Mars">Mars</Link>                       // строка, как её читает <a href>: относительно адреса
<Link href={{ path: '/search', query: { q: text } }}>  // изменение адреса: значения закодированы
<NavLink href="/catalog" activeAsParent>Каталог</NavLink> // `active` на своём адресе или под ним
<NavLink href="/help" active={isHelpOpen}>Помощь</NavLink> // или когда так сказано
<Link href="https://vk.com/faq">FAQ</Link>              // другой сайт (схема или хост): обычная ссылка
```

Клик, который обрабатывает браузер, остаётся браузеру: клавиша-модификатор (Cmd / Ctrl — новая вкладка, Shift — новое
окно), средняя кнопка, `target="_blank"`, `download` — `onClick` его всё равно слышит. `href` со схемой или хостом
(`https://…`, `mailto:…`, `//cdn…`) ведёт за пределы части роутера: по нему переходит браузер, и он никогда не
принимается за путь приложения (и не отмечает `NavLink`).

`Link` перерисовывается, только когда меняется его цель (у абсолютного `href` — никогда); `NavLink` — только когда
меняется отметка.

## `useAnimationFrame` — цикл кадров в компоненте

`animationFrameProvider({ useRef, useEffect })` даёт `useAnimationFrame(callback, options?)` — цикл
`createAnimationFrame` ([`src/browser/`](../browser/README.ru.md)) для компонента: `callback(delta, time)` на каждом
кадре, `delta` 0 на первом кадре после каждого старта, кадр длиннее `maxDelta` (250 мс: скрытая вкладка, зависание)
пропускается, а при `clamp: true` считается за `maxDelta`. `time` — сумма выданных дельт, продолжается после любой
остановки. Вызывается колбэк последнего рендера — без `deps`. Размонтирование отменяет запрошенный кадр.

Два способа остановить, раздельно: **состояние** — `active` (по умолчанию `true`), пишется в рендере; **событие** —
`pause()` из обработчика или изнутри колбэка. Цикл идёт, пока позволяют оба. Возвращает `TPlayback`,
`[play, pause, isPlaying]` — один и тот же кортеж на каждом рендере.

```tsx
export const { useAnimationFrame } = animationFrameProvider(LIBRARY);   // один раз, в зависимостях приложения

// стоит, пока его закрывает окно или игрок попросил меньше движения; продолжает с того же угла
useAnimationFrame((delta) => api.rotate({ y: delta * 0.24 }), { active: !reduced && !dialogOpen });

// останавливается сам: рендер не нужен
const [, pause] = useAnimationFrame((delta) => {
  position = Math.min(position + delta * 0.5, target);
  if (position === target) {
    pause();
  }
});

// кнопка паузы; монета, которая крутится только под указателем
const [play, pause, isPlaying] = useAnimationFrame(tick);
<button onClick={() => (isPlaying() ? pause() : play())} />
const [spin, still] = useAnimationFrame(turn, { autoplay: false });
<div onPointerEnter={spin} onPointerLeave={still} />

// спрайт по 12 картинок в секунду на любом экране: один вызов на ~83 накопленные мс
useAnimationFrame(() => sprite.next(), { interval: 1000 / 12 });
```

- Опции: `active` (true), `autoplay` (true; `false` — стоит до `play()`) и опции цикла `interval` (0), `maxDelta`
  (250), `clamp` (false), `frame`. Смена опций цикла перезапускает его; часы продолжаются.
- `isPlaying()` — идут ли кадры сейчас: `false` после `pause()` и пока `active` равен `false`, даже после `play()`;
  тогда `play()` отмечает желание, и цикл стартует, когда `active` станет true.
- Уменьшение движения читает вызывающий (он отличает декоративное вращение от индикатора прогресса): передайте его в
  `active`.
- Опции проверяются при монтировании, в разработке; неизвестный ключ или неверное значение — ошибка.

## `useT`, `LocaleProvider`, `<Text>` — привязки локали

`localeViewProvider(React)` — см. [`fundamentool/i18n`](../i18n/README.ru.md#react--fundamentool-его-привязки-view): `useT(set)`
перерисовывает компонент при смене его локали — и только тогда; `LocaleProvider` задаёт локаль части дерева; `<Text>`
рисует теги сообщения рендерерами приложения или сообщение, переданное данными.

## `dynamicLoaderProvider` — части в отдельных файлах, объявленные там, где используются

`dynamicLoaderProvider(React, options)` — один вызов на приложение; возвращает сам загрузчик со своим видом для части в
пути (`renderLoading`) и для неудачи (`renderFailed({ error, retry })` — своё сообщение и «Повторить», своими текстами).
`module(load)` объявляет модуль там, где он используется — лениво, ничего не загружается;
`component(module, (m) => m.X)` берёт из него компонент, который загружается (один раз, через `dynamicModule`) при
первом показе. Реестр загрузчика: `$state` — `{ total, loaded, failed }` (`failed` — модули, которые не загрузились),
`preload()` — все модули, для шага загрузки, `retry()` — повторно неудавшиеся.

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
// загрузка: суммарная готовность как прогресс; что не загрузилось — повторно
$wgDynamicState.watch(({ total, loaded }) => report(total ? loaded / total : 1));
await wgDynamicPreload().catch(() => wgDynamicRetry());
```

## Файлы

| Файл | Что в нём |
|------|-----------|
| `library.ts` | `TViewLibrary`, `VIEW_LIBRARY_KEYS`, `viewLibraryShape` (библиотека как форма схемы, `fundamentool/schema`) |
| `viewHooksProvider.ts` | `useUnit`, `useStoreMap` |
| `linksProvider.ts` | `Link`, `NavLink` |
| `animationFrameProvider.ts` | `useAnimationFrame`, `TPlayback` — цикл кадров в компоненте, над `createAnimationFrame` |
| `localeViewProvider.ts` | `useT`, `useLocale`, `LocaleProvider`, `Text` — привязки локали (`fundamentool/i18n`) |
| `dynamicLoaderProvider.ts` | `dynamicLoaderProvider` — части в отдельных файлах: `module`, `component`, реестр (web-games D-100) |
