# Привязки к виду: хуки, читающие сторы, ссылки для любого роутера

[English version](./README.md)

Код вида в fundamentool строится поверх **React-подобной библиотеки, которую передаёт приложение** (`TViewLibrary`:
React, Preact `compat`; позже — своя в fundamentool) — fundamentool D-048, D-049. Два провайдера:

```ts
const LIBRARY = {
  createElement: React.createElement, forwardRef: React.forwardRef, useSyncExternalStore: React.useSyncExternalStore,
  useEffect: React.useEffect, useState: React.useState, useRef: React.useRef,
  createContext: React.createContext, useContext: React.useContext,
};
export const { useUnit, useStoreMap } = viewHooksProvider(LIBRARY);   // один раз, в зависимостях приложения
export const { Link, NavLink } = linksProvider({ router, ...LIBRARY });
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
```

`Link` перерисовывается, только когда меняется его цель (у абсолютного `href` — никогда); `NavLink` — только когда
меняется отметка.

## Файлы

| Файл | Что в нём |
|------|-----------|
| `library.ts` | `TViewLibrary`, `VIEW_LIBRARY_KEYS`, `assertViewLibrary` |
| `viewHooksProvider.ts` | `useUnit`, `useStoreMap` |
| `linksProvider.ts` | `Link`, `NavLink` |
