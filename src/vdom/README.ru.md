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

`fundamentool/vdom/react` заменяет пять входов React. Сборщик и запускатель тестов направляют их все туда; код
приложения и его библиотеки не меняются. Это весь `fundamentool/vdom` плюс экспорт по умолчанию — для библиотек с
`import React from 'react'` (MUI, emotion):

```ts
// vite.config.ts — массив регулярных выражений: ключ `react` поймал бы и `react/jsx-runtime`
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

`@vitejs/plugin-react` не нужен: его Fast Refresh требует самого React. JSX компилирует esbuild (`"jsx": "react-jsx"`
в `tsconfig.json`), правка перезагружает страницу. Типы остаются от `@types/react`.

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
| `act` | для тестов: рендерит очередь и выполняет эффекты; с асинхронной работой ждёт, пока работа не перестанет появляться (сброс, задача ожидания, снова проверка) |

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
