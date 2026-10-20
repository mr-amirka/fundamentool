// Checks of the router's dependencies and options, made once when they're given (api-input-validation.md).
import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import {
  isArray,
} from '../is/isArray';
import {
  isBoolean,
} from '../is/isBoolean';
import {
  isDefined,
} from '../is/isDefined';
import {
  isFunction,
} from '../is/isFunction';
import {
  isNumber,
} from '../is/isNumber';
import {
  isObject,
} from '../is/isObject';
import {
  isString,
} from '../is/isString';
import {
  keys,
} from '../keys';
import type {
  TOpenOptions,
  TRouterProviderDeps,
} from './types';
import {
  NAVIGATION_HOST_DEPS,
  OPEN_OPTION_KEYS,
  ROUTER_DEPS_KEYS,
  ROUTER_WHERE,
  SEPARATE,
  SHARED,
} from './constants';

/** "What was expected, what came" for one option. */
export function invalid(
  key: string, expected: string, value: unknown,
): TypeError {
  return new TypeError(`${ROUTER_WHERE}: "${key}" expects ${expected}, got ${describeValue(value)}`);
}

/** Checks the dependencies once, at creation (lab convention `api-input-validation.md`). */
export function assertRouterDeps(deps: unknown): asserts deps is TRouterProviderDeps {
  if (!isObject(deps) || isArray(deps)) {
    throw new TypeError(`${ROUTER_WHERE}: expects a dependencies object, got ${describeValue(deps)}`);
  }
  assertKnownOptions(
    ROUTER_WHERE, deps, ROUTER_DEPS_KEYS,
  );
  const raw = deps as Record<string, unknown>;
  const win = raw.window as Window | null;
  if (!isObject(win) || !isFunction(win.history?.pushState)) {
    throw invalid(
      'window', 'a browser window', win,
    );
  }
  let key: string;
  let value: unknown;
  for (key of [
    ...NAVIGATION_HOST_DEPS,
    'forwardRef',
    'createObservable',
    'createApi',
  ] as const) {
    value = raw[key];
    if (!isFunction(value)) {
      throw invalid(
        key, 'a function', value,
      );
    }
  }
  const describe = raw.describe;
  if (isDefined(describe) && !isFunction(describe)) {
    throw invalid(
      'describe', 'a function (location) => page info', describe,
    );
  }
  const sections = raw.sections;
  if (isDefined(sections) && (!isObject(sections) || isArray(sections) || !Object.values(sections).every(isString))) {
    throw invalid(
      'sections', 'an object section → main page path', sections,
    );
  }
  for (key of [
    'keep',
    'exitMs',
  ]) {
    value = raw[key];
    if (isDefined(value) && !(isNumber(value) && value >= 0 && Number.isFinite(value))) {
      throw invalid(
        key, 'a number ≥ 0', value,
      );
    }
  }
  const sectionHistory = raw.sectionHistory;
  if (isDefined(sectionHistory) && sectionHistory !== SHARED && sectionHistory !== SEPARATE) {
    throw invalid(
      'sectionHistory', '"shared" or "separate"', sectionHistory,
    );
  }
  if (sectionHistory === SEPARATE && !(sections && keys(sections).length)) {
    throw invalid(
      'sectionHistory', '`sections` beside "separate"', sectionHistory,
    );
  }
}

/** Checks `open`'s options (cold path: once per window). */
export function assertOpenOptions(options: unknown): asserts options is TOpenOptions | undefined {
  if (!isDefined(options)) {
    return;
  }
  if (!isObject(options) || isArray(options)) {
    throw new TypeError(`${ROUTER_WHERE} open: expects an options object, got ${describeValue(options)}`);
  }
  assertKnownOptions(
    `${ROUTER_WHERE} open`, options, OPEN_OPTION_KEYS,
  );
  const reopen = (options as TOpenOptions).reopen;
  if (isDefined(reopen) && !isBoolean(reopen)) {
    throw invalid(
      'reopen', 'a boolean', reopen,
    );
  }
}
