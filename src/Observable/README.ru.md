# Реактивное ядро: сторы, производные сторы, события

[English version](./README.md)

Реактивный API fundamentool держится **поведения Effector** (fundamentool D-049) — написанное против него работает так
же, когда вместо него внедрён effector (`TObservableAdapter`), и закладывается основа для своего Effector в fundamentool
(D-048).

```ts
const $count = createObservable(0);                  // стор — значение, которое есть
$count.watch((count) => render(count));              // сразу с 0, затем при каждом изменении
$count.setState(1);                                  // равное значение (===) — не изменение

const $even = $count.map((count) => count % 2 === 0); // производный стор: меняется, когда меняется результат

const saved = createEvent<string>();                 // событие — то, что происходит
saved.watch((id) => toast(id));                      // только при вызовах, никогда при подписке
saved('note-7');                                     // возвращает свой payload

const api = createApi($count, { add: (count, n: number) => count + n }); // события, обновляющие стор
api.add(2);                                          // их наблюдатели видят стор уже обновлённым
```

| Поведение | Как в Effector |
|-----------|----------------|
| `watch` стора срабатывает **сразу** с текущим значением, затем при каждом изменении | `store.watch` |
| равное значение (`===`) — не изменение | да |
| `watch` возвращает функцию, у которой есть и `{ unsubscribe }` | `Subscription` |
| `map` меняется, только когда меняется его результат | да |
| `watch` события срабатывает только при вызовах | `event.watch` |
| `createApi` возвращает события (вызываемые — возвращают payload; наблюдаемые) | да |
| бросивший исключение наблюдатель логируется; остальные выполняются | да |

**Одно отличие, намеренное: `map` ничего не держит, пока на него никто не подписан.** На источник он подписывается с
первым наблюдателем и отписывается после последнего; без наблюдателей вычисляется при чтении (один раз на значение
источника). Производный стор, созданный и брошенный — скажем, в рендере компонента, — не оставляет подписки.

Пока нет — придут со своим Effector в fundamentool: `store.updates`, `store.on / reset`, `event.map / filter /
prepend`, `combine`, `sample`, скоупы. Не принято: пропуск `undefined` из редьюсера (`skipVoid`, устаревший в самом
effector). Полное сравнение — исследование 12 (`PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/RESEARCH/`).

Код, который стор только читает, принимает `TStore` (`getState` + `watch` — fundamentool или effector: `useUnit`,
ворота навигатора); `isStore(unit)` отличает стор от события.

## Файлы

| Файл | Что в нём |
|------|-----------|
| `index.ts` | `createObservable`, `createEvent`, `createApi`, `isStore` |
| `types.ts` | `Observable`, `ObservableWritable`, `TStore`, `TEvent`, `Unsubscribe`, `TObservableAdapter` |
