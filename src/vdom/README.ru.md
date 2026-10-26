# vdom

> [English version](README.md)

> ⚠️ Проба (fundamentool D-072), `[draft]`. Имя `fundamentool/vdom` рабочее.

Своя библиотека отображения fundamentool: API React (элементы, функциональные компоненты, хуки, контексты, порталы,
`createRoot`) на собственном реконсилере. Всё, чем пользуется приложение с MUI и emotion, весит **5,6 КБ gzip**:
React 19 — 67,6 КБ, Preact с `preact/compat` — 8,2 КБ. Библиотеки, написанные для React (MUI, emotion,
react-transition-group), работают на ней без изменений: у элементов форма и символы `$$typeof` React 19, `ref` — проп.

```ts
import { createElement as h, createRoot, useState } from 'fundamentool/vdom';

function Counter() {
  const [n, setN] = useState(0);
  return h('button', { onClick: () => setN(n + 1) }, n);
}

createRoot(document.getElementById('root')!).render(h(Counter));
```

## В приложении вместо React

Один вход заменяет четыре входа React: сборщик направляет их все сюда. Код приложения и его библиотеки не меняются:

```ts
// vite.config.ts
const VDOM = 'fundamentool/vdom';
export default defineConfig({
  resolve: {
    alias: [
      { find: /^react-dom\/client$/, replacement: VDOM },
      { find: /^react-dom$/, replacement: VDOM },
      { find: /^react\/jsx(-dev)?-runtime$/, replacement: VDOM },
      { find: /^react$/, replacement: VDOM },
    ],
  },
});
```

Библиотеке с `import React from 'react'` нужен экспорт по умолчанию. У модуля его нет — линт лаборатории запрещает
экспорты по умолчанию. Его даёт прокладка в две строки:
`import * as React from 'fundamentool/vdom'; export * from 'fundamentool/vdom'; export default React;`.

## Что в ней есть

| Член | Как в React |
|------|-------------|
| `createElement`, `jsx` / `jsxs` / `jsxDEV`, `cloneElement`, `isValidElement`, `Children` | те же результаты; `key` уходит из пропсов, `ref` остаётся в них (React 19); `defaultProps` применяются |
| `Fragment`, `StrictMode` | `StrictMode` рендерит детей (двойных рендеров режима разработки React нет) |
| `memo`, `forwardRef` | `memo` сравнивает пропсы поверхностно или вашим `compare` |
| `createContext`, `useContext` | контекст сам себе провайдер (`<Theme value>`); `Provider` и `Consumer` тоже есть |
| `createPortal`, `createRoot` | первый `render` очищает контейнер |
| `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useId` | равное значение (`Object.is`) не рендерит заново |
| `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useImperativeHandle` | `useEffect` выполняется в следующей задаче или перед следующим рендером — что наступит раньше |
| `useSyncExternalStore`, `useEffectEvent`, `useDebugValue` | `useDebugValue` ничего не делает (инструментов разработчика нет) |

## Как идёт обновление

- **Рендер.** Изменение состояния ставит компонент в очередь. Очередь рендерится в микрозадаче, начиная с самых
  мелких по глубине, поэтому родитель и ребёнок, поставленные вместе, рендерятся по разу. DOM меняется во время
  рендера, как в Preact.
- **Фиксация.** Layout-эффекты и рефы выполняются после изменения DOM, дети раньше родителей. Состояние, заданное в
  layout-эффекте, рендерится заново до отрисовки браузером.
- **Пассивные эффекты.** `useEffect` выполняется в одной из следующих задач: сначала все очистки, потом все эффекты.

## Как она работает с DOM

- **Дети.** Дети сопоставляются по ключу, а без ключа — по месту. Заново вставляются только переместившиеся узлы.
- **Пропсы.** Проп пишется свойством DOM, если у узла оно есть, иначе атрибутом (правило Preact, исключения Preact).
  - `className` становится `class`, `htmlFor` — `for`.
  - В SVG атрибуты из camelCase становятся kebab-case.
  - Числовые стили получают `px`, если свойство не безразмерное.
- **События.**
  - Каждый узел сам слушает свои события; делегирования нет.
  - `onChange` у текстового поля слушает `input`.
  - `onFocus` и `onBlur` слушают `focusin` и `focusout`, поэтому всплывают, как в React.
  - `onClickCapture` слушает в фазе перехвата.
  - Обработчик получает событие DOM с добавленными `nativeEvent`, `persist()`, `isDefaultPrevented()` и
    `isPropagationStopped()`.
- **Поля форм.**
  - `value` и `checked` задаются после детей, так что у `<select>` к этому моменту уже есть варианты.
  - `defaultValue` и `defaultChecked` задаются один раз, при монтировании.

## Чего нет

- Классовых компонентов (`Component`, `PureComponent`).
- `Suspense`, `lazy`, переходов (`useTransition`, `useDeferredValue`).
- Серверного рендера и гидратации.
- Предупреждений режима разработки React.
