# is

> [Русская версия](README.ru.md)

Type predicate utilities — runtime type guards with full TypeScript narrowing.

## When you need it

- Check a value's type at run time and narrow it in TypeScript: a string, a plain object, an array, a promise.
- Compare two values deeply (to a depth), or check that an object matches a pattern.
- Validate an email, a phone number, a URL, a hash.
- Tell a `Buffer`, a `Blob`, `FormData` apart; whether an element is visible in the viewport.

```ts
import * as is from 'fundamentool/is';
import { isString, isEqual, isMatch } from 'fundamentool/is';
```

---

## Primitive types

| Function | Returns `true` when |
|----------|---------------------|
| `isString(v)` | `typeof v === 'string'` |
| `isNumber(v)` | `typeof v === 'number'` |
| `isBoolean(v)` | `typeof v === 'boolean'` |
| `isFunction(v)` | `typeof v === 'function'` |
| `isInteger(v)` | `Number.isInteger(v)` |
| `isSafeNumber(v)` | value is a finite, safe number |
| `isNaN(v)` | `Number.isNaN(v)` |

---

## Objects and collections

| Function | Returns `true` when |
|----------|---------------------|
| `isObject(v)` | `typeof v === 'object' && v !== null` |
| `isObjectLike(v)` | object-like (non-null object or function) |
| `isPlainObject(v)` | plain `{}` object (own constructor or `Object`) |
| `isStandardObject(v)` | standard object (not Date, RegExp, etc.) |
| `isStore(v)` | a store: `getState` + `watch` (fundamentool's `createObservable` or effector's); an event isn't one |
| `isArray(v)` | `Array.isArray(v)` |
| `isArrayLike(v)` | has numeric `length` property |
| `isCollection(v)` | array or plain object |
| `isDate(v)` | instance of `Date` |
| `isRegExp(v)` | instance of `RegExp` |
| `isPromise(v)` | has `.then` method |

---

## Values

| Function | Returns `true` when |
|----------|---------------------|
| `isDefined(v)` | `v !== undefined && v !== null` |
| `isEmpty(v)` | empty string / array / object |
| `isLength(v)` | valid array-like length |
| `isIndex(v)` | valid array index |
| `isInsign(v)` | insignificant value (null, undefined, empty string, NaN) |

---

## Deep comparison

| Function | Description |
|----------|-------------|
| `isEqual(a, b, depth?)` | Deep equality up to `depth` levels of nesting (default `0`: nested objects by reference); `NaN` equals `NaN`, `Date`s compare by time and `RegExp`s by source and flags at any depth |
| `isMatch(value, pattern)` | Whether `value` matches a pattern of [`fundamentool/match`](../match/README.md): only the pattern's keys are compared, a list means any of its items, a RegExp finds in a string |

```ts
isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } });    // false — depth 0, `b` by reference
isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }, 1); // true
isMatch({ a: 1, b: 2, c: 3 }, { a: 1 });                  // true — extra keys are ignored
isMatch({ tags: ['x', 'y'] }, { tags: 'y' });             // true — the array holds it
```

---

## Validation

| Function | Returns `true` when |
|----------|---------------------|
| `isEmail(v)` | valid email address |
| `isPhone(v)` | valid phone number |
| `isHttpUrl(v)` | valid HTTP/HTTPS URL |
| `isHash(v)` | hex hash string |
| `isASCII(v)` | ASCII-only string |
| `isInvalidStringLength(v, min, max)` | string length is outside `[min, max]` |

---

## Platform / environment

| Function | Returns `true` when |
|----------|---------------------|
| `isBuffer(v)` | Node.js `Buffer` instance |
| `isArrayBuffer(v)` | `ArrayBuffer` instance |
| `isBlob(v)` | `Blob` instance |
| `isFormData(v)` | `FormData` instance |
| `isDocumentStateReady(win)` | `document.readyState` is `'complete'` or `'interactive'` |
| `isVisibleInViewport(el)` | DOM element is visible in the viewport |
| `isIE()` | current browser is Internet Explorer |
