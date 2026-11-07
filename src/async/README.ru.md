# async

> [English version](README.md)

Набор утилит для работы с асинхронным кодом и коллекциями.

## Когда нужен

- Выполнить async-функцию над каждым элементом списка или объекта — по очереди или все сразу: map, filter, find,
  reduce.
- Повторять задачу каждые N мс, каждый запуск заканчивается до следующего.
- Вызовы, которые не должны пересекаться, — каждый ждёт предыдущего (очередь сохранений), пауза между ними.
- Debounce, возвращающий промис; минимальная длительность, чтобы спиннер не мигал.
- Хуки, чьи обработчики могут ждать: [`fundamentool/async/hooks`](hooks/README.ru.md).

```ts
import * as async from 'fundamentool/async';
import { mapAsync, sequence, intervalAsync } from 'fundamentool/async';
```

> Асинхронные хуки — те же виды, что в `fundamentool/hooks`, для обработчиков, которые могут ждать, — отдельный модуль:
> [`fundamentool/async/hooks`](hooks/README.ru.md). `fundamentool/async` их не переэкспортирует: их имена — имена
> синхронного модуля.

---

## Базовые примитивы

| Функция | Описание |
|---------|----------|
| `loopAsync(fn)` | Асинхронный цикл: выполняет `fn` пока та возвращает truthy |
| `intervalAsync(fn, ms)` | Периодически запускает `fn` через `ms` мс, ждёт завершения промиса |
| `checkNoop` | Предикат-заглушка, всегда возвращает `true` |

```ts
// Остановить через 5 секунд
const stop = intervalAsync(async () => {
  await processQueue();
}, 1000);
setTimeout(stop, 5000);
```

---

## Итерация по коллекциям (последовательная)

| Функция | Описание |
|---------|----------|
| `forEachAsync(arr, fn)` | Последовательный обход массива |
| `forInAsync(obj, fn)` | Последовательный обход объекта |
| `eachAsync(col, fn)` | Выбирает `forEachAsync` или `forInAsync` по типу коллекции |

---

## Трансформации коллекций (последовательные)

| Функция | Описание |
|---------|----------|
| `mapAsync(arr, fn)` | Асинхронный `map` для массива |
| `mapInAsync(obj, fn)` | Асинхронный `map` для объекта |
| `filterAsync(arr, fn)` | Асинхронный `filter` для массива |
| `filterInAsync(obj, fn)` | Асинхронный `filter` для объекта |
| `findAsync(arr, fn)` | Асинхронный `find` для массива |
| `findInAsync(obj, fn)` | Асинхронный `find` для объекта |
| `reduceAsync(arr, fn, init)` | Асинхронный `reduce` для массива |
| `reduceInAsync(obj, fn, init)` | Асинхронный `reduce` для объекта |

```ts
const results = await mapAsync([1, 2, 3], async (n) => {
  const data = await fetch(`/api/${n}`);
  return data.json();
});
```

---

## Параллельные версии

Все функции выше имеют параллельные варианты с суффиксом `Parallel`:

`loopParallel`, `forEachParallel`, `forInParallel`, `eachParallel`,
`mapParallel`, `mapInParallel`, `filterParallel`, `filterInParallel`,
`findParallel`, `findInParallel`, `reduceParallel`, `reduceInParallel`

```ts
const results = await mapParallel([url1, url2, url3], async (url) => {
  return fetch(url).then(r => r.json());
});
```

---

## Обёртки над функциями

| Функция | Описание |
|---------|----------|
| `withDelayAsync(fn, ms)` | Debounce с возвращаемым промисом результата |
| `sequence(fn)` | Последовательные вызовы: следующий ждёт предыдущего |
| `sequenceDelay(fn, ms)` | Как `sequence`, но с задержкой между вызовами |
| `withLatencyProvider(fn, minMs)` | Гарантирует минимальную длительность вызова |

```ts
// Последовательная очередь запросов
const saveSequential = sequence(async (data) => {
  await api.save(data);
});
saveSequential(data1); // запустится сразу
saveSequential(data2); // дождётся data1

// Минимальная задержка (например, чтобы не мигал лоадер)
const fetchWithMinDelay = withLatencyProvider(fetchData, 300);
```
