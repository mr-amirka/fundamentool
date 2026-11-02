import {
  func,
  lazy,
  object,
  oneOf,
  record,
  string,
  unknown,
} from '../schema';

/** The prefix of the module's messages. */
export const WHERE = '[fundamentool/hooks]';

const HOOK_OPTIONS = /*#__PURE__*/ lazy(() => object({
  name: string().optional(),
}));

const ADD_OPTIONS = /*#__PURE__*/ lazy(() => object({
  order: oneOf([
    'pre',
    'post',
  ]).optional(),
  by: string().optional(),
}));

const FUNCTION = /*#__PURE__*/ lazy(func);

const ORDER_OPTIONS = /*#__PURE__*/ lazy(() => object({
  connected: record(unknown()).optional(),
  where: string().optional(),
}));

/**
 * Checks a hook factory's options — in development only (`api-input-validation.md`, lab D-023).
 *
 * @param options - What the caller passed to a hook's factory, sync or async.
 * @param where - `[fundamentool/hooks] waterfallHook`, `[fundamentool/async/hooks] parallelHook`.
 * @throws {TypeError} an unknown option ("did you mean"), a name that isn't a string.
 */
export function checkHookOptions(options: unknown, where: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    HOOK_OPTIONS().parse(options || {}, where);
  }
}

/**
 * Checks `add`'s handler and options — in development only (lab D-023).
 *
 * @param handler - The handler.
 * @param options - `{ order, by }`.
 * @param where - `[documents] beforeWrite add`.
 * @throws {TypeError} a handler that isn't a function; an unknown option, an `order` other than `pre` / `post`.
 */
export function checkAdd(
  handler: unknown, options: unknown, where: string,
): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    FUNCTION().parse(handler, `${where}: the handler`);
    ADD_OPTIONS().parse(options || {}, where);
  }
}

/**
 * Checks that `value` is a function — in development only (lab D-023): `hookMap`'s `create`.
 *
 * @param value - What the caller passed.
 * @param where - `[fundamentool/hooks] hookMap: create`.
 * @throws {TypeError} not a function.
 */
export function checkFunction(value: unknown, where: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    FUNCTION().parse(value, where);
  }
}

/**
 * Checks `orderPresets`' options — in development only (lab D-023).
 *
 * @param options - `{ connected, where }`.
 * @param where - `[fundamentool/hooks] orderPresets`.
 * @throws {TypeError} an unknown option ("did you mean"), a wrong value.
 */
export function checkOrderOptions(options: unknown, where: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    ORDER_OPTIONS().parse(options || {}, where);
  }
}
