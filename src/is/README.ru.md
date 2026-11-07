# is

> [English version](README.md)

Предикаты типов — runtime type guards с полным TypeScript narrowing.

## Когда нужен

- Проверить тип значения во время выполнения и сузить его в TypeScript: строка, простой объект, массив, промис.
- Сравнить два значения глубоко (до глубины) или проверить, что объект подходит под шаблон.
- Проверить email, телефон, URL, хеш.
- Отличить `Buffer`, `Blob`, `FormData`; видим ли элемент во вьюпорте.

```ts
import * as is from 'fundamentool/is';
import { isString, isEqual, isMatch } from 'fundamentool/is';
```

---

## Примитивные типы

| Функция | Возвращает `true` если |
|---------|------------------------|
| `isString(v)` | `typeof v === 'string'` |
| `isNumber(v)` | `typeof v === 'number'` |
| `isBoolean(v)` | `typeof v === 'boolean'` |
| `isFunction(v)` | `typeof v === 'function'` |
| `isInteger(v)` | `Number.isInteger(v)` |
| `isSafeNumber(v)` | конечное, безопасное число |
| `isNaN(v)` | `Number.isNaN(v)` |

---

## Объекты и коллекции

| Функция | Возвращает `true` если |
|---------|------------------------|
| `isObject(v)` | `typeof v === 'object' && v !== null` |
| `isObjectLike(v)` | объектоподобное значение (ненулевой объект или функция) |
| `isPlainObject(v)` | чистый объект `{}` (через `Object` или без конструктора) |
| `isStandardObject(v)` | стандартный объект (не Date, RegExp и т.д.) |
| `isArray(v)` | `Array.isArray(v)` |
| `isArrayLike(v)` | имеет числовое свойство `length` |
| `isCollection(v)` | массив или plain object |
| `isDate(v)` | экземпляр `Date` |
| `isRegExp(v)` | экземпляр `RegExp` |
| `isPromise(v)` | имеет метод `.then` |

---

## Значения

| Функция | Возвращает `true` если |
|---------|------------------------|
| `isDefined(v)` | `v !== undefined && v !== null` |
| `isEmpty(v)` | пустая строка / массив / объект |
| `isLength(v)` | допустимая длина array-like |
| `isIndex(v)` | допустимый индекс массива |
| `isInsign(v)` | незначимое значение (null, undefined, пустая строка, NaN) |

---

## Глубокое сравнение

| Функция | Описание |
|---------|----------|
| `isEqual(a, b, depth?)` | Глубокое равенство до `depth` уровней вложенности (по умолчанию `0`: вложенные объекты — по ссылке); `NaN` равен `NaN`, `Date` сравниваются по времени, `RegExp` — по исходнику и флагам, на любой глубине |
| `isMatch(value, pattern)` | Подходит ли `value` под шаблон [`fundamentool/match`](../match/README.ru.md): сравниваются только ключи шаблона, список значит «любой из», RegExp ищет в строке |

```ts
isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } });    // false — глубина 0, `b` по ссылке
isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }, 1); // true
isMatch({ a: 1, b: 2, c: 3 }, { a: 1 });                  // true — лишние ключи игнорируются
isMatch({ tags: ['x', 'y'] }, { tags: 'y' });             // true — массив его содержит
```

---

## Валидация

| Функция | Возвращает `true` если |
|---------|------------------------|
| `isEmail(v)` | корректный email-адрес |
| `isPhone(v)` | корректный номер телефона |
| `isHttpUrl(v)` | корректный HTTP/HTTPS URL |
| `isHash(v)` | hex-строка хеша |
| `isASCII(v)` | строка только из ASCII-символов |
| `isInvalidStringLength(v, min, max)` | длина строки выходит за пределы `[min, max]` |

---

## Платформа / окружение

| Функция | Возвращает `true` если |
|---------|------------------------|
| `isBuffer(v)` | экземпляр Node.js `Buffer` |
| `isArrayBuffer(v)` | экземпляр `ArrayBuffer` |
| `isBlob(v)` | экземпляр `Blob` |
| `isFormData(v)` | экземпляр `FormData` |
| `isDocumentStateReady(win)` | `document.readyState` равно `'complete'` или `'interactive'` |
| `isVisibleInViewport(el)` | DOM-элемент виден во вьюпорте |
| `isIE()` | текущий браузер — Internet Explorer |
