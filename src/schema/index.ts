// Option schemas (fundamentool D-051): what a public entry point accepts, described once — the check, the type
// (`TInfer`) and the key list come from it. zod's names and behaviour, with the lab's rules: an unknown key is an error
// with "did you mean" (`api-input-validation.md`; zod strips it), messages "… expects …, got …". A cold path: a factory
// checks once.
import {
  nearestKnown as nearestOf,
  unknownOptionText,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import {
  isArray,
} from '../is/isArray';
import {
  isFunction,
} from '../is/isFunction';
import {
  isObject,
} from '../is/isObject';

/** One step into a value: an object's key, a list's place, or a label that names the part from there on. */
type TStep = [kind: 'key' | 'index' | 'label', text: string];

/** The first problem found: where, and what is wrong there. */
type TProblem = {
  path: readonly TStep[];
  /** "expects …, got …", or the message of a rule. */
  text: string;
  /** An unknown key: the message reads "<path>: unknown option …". */
  unknownKey?: boolean;
  /** A rule's own message (`refine`): `describe` keeps it. */
  rule?: boolean;
};

/** What a schema checks with: `null` — fits; otherwise the first problem. */
type TCheck = (value: unknown, path: readonly TStep[]) => TProblem | null;

/** How a message names a part: from its value and its key or place. */
export type TLabel<T> = (value: T, at: string | number) => string;

/** A schema of values of type `T`. */
export type TSchema<T> = {
  /** What kind of schema it is (`object`, `array`, …). */
  readonly kind: string;
  /** What it expects, in a message ("true or false", "a list"). */
  readonly expected: string;
  /** The check: `null` — the value fits. */
  readonly check: TCheck;
  /** The phantom of `T` (types only). */
  readonly _type?: T;
  /** `undefined` fits too. */
  optional(): TSchema<T | undefined>;
  /**
   * A rule over the value (after its own check): `false` — `message` is the problem (a function of the value — to name
   * what broke it).
   */
  refine(rule: (value: T) => boolean, message: string | ((value: T) => string)): TSchema<T>;
  /** What a message says it expects, instead of the default. */
  describe(expected: string): TSchema<T>;
  /** How a message names this part (a row by its pattern); from it on the path starts anew. */
  label(name: TLabel<T>): TSchema<T>;
  /** Checks `value`: returns it, or throws a `TypeError` "`where`: … expects …, got …". */
  parse(value: unknown, where: string): T;
  /** Checks `value` without throwing. */
  safeParse(value: unknown): { success: true;
    data: T } | { success: false;
      error: TypeError };
};

/** The type a schema describes. */
export type TInfer<S> = S extends TSchema<infer T> ? T : never;

/** A schema's keys whose values may be left out. */
type TOptionalKeys<S> = { [K in keyof S]: undefined extends TInfer<S[K]> ? K : never }[keyof S];

/** An object of a shape: the keys that may be undefined become optional. */
type TObjectOf<S> = { [K in Exclude<keyof S, TOptionalKeys<S>>]: TInfer<S[K]> } & { [K in TOptionalKeys<S>]?: TInfer<S[K]> };

/** An object schema: also its keys and `passthrough`. */
export type TObjectSchema<S extends Record<string, TSchema<unknown>>, T = TObjectOf<S>> = Omit<TSchema<T>, 'refine' | 'describe' | 'label'> & {
  /** The shape's keys — the single list an entry point's `*_KEYS` constant comes from. */
  readonly keys: readonly (keyof S & string)[];
  /** Keys outside the shape are allowed (the app's own fields of a row). */
  passthrough(): TObjectSchema<S, T & Record<string, unknown>>;
  /** As `TSchema.refine` — still an object schema. */
  refine(rule: (value: T) => boolean, message: string | ((value: T) => string)): TObjectSchema<S, T>;
  /** As `TSchema.describe` — still an object schema. */
  describe(expected: string): TObjectSchema<S, T>;
  /** As `TSchema.label` — still an object schema. */
  label(name: TLabel<T>): TObjectSchema<S, T>;
};

/** A number schema: also its bounds. */
export type TNumberSchema = TSchema<number> & {
  /** At least `n`. */
  min(n: number): TNumberSchema;
  /** A whole number. */
  int(): TNumberSchema;
  /** Not `Infinity` (zod's `.finite()`). */
  finite(): TNumberSchema;
};

/** A problem at `path`: "expects …, got …". */
const wrong = (
  path: readonly TStep[], expected: string, value: unknown,
): TProblem => ({
  path,
  text: `expects ${expected}, got ${describeValue(value)}`,
});

/** The path as a message reads it: `the row "/x": "keep"`, `"routes"[2]`. */
function render(problem: TProblem): string {
  let head = '';
  for (const [
    kind,
    text,
  ] of problem.path) {
    if (kind === 'label') {
      head = text + ':';
    } else if (kind === 'index') {
      head += (head.endsWith(':') ? ' ' : '') + `[${text}]`;
    } else {
      head += (head && !head.endsWith(':') ? '.' : head ? ' ' : '') + `"${text}"`;
    }
  }
  if (!head) {
    return problem.text;
  }
  const labelled = head.endsWith(':');
  return problem.unknownKey && !labelled ? `${head}: ${problem.text}` : `${head} ${problem.text}`;
}

/** A schema from its check; the methods every schema has. */
function make<T>(
  kind: string, expected: string, check: TCheck,
): TSchema<T> {
  const self: TSchema<T> = {
    kind,
    expected,
    check,
    optional: () => make<T | undefined>(
      kind, expected, (value, path) => (value === undefined ? null : check(value, path)),
    ),
    refine: (rule, message) => make<T>(
      kind, expected, (value, path) => check(value, path) || (rule(value as T) ? null : {
        path,
        text: isFunction(message) ? message(value as T) : message,
        rule: true,
      }),
    ),
    describe: (text) => make<T>(
      kind, text, (value, path) => {
        const problem = check(value, path);
        // Only a problem with the value itself says what is expected; a problem inside it stays its own
        return problem && problem.path === path && !problem.unknownKey && !problem.rule ? wrong(
          path, text, value,
        ) : problem;
      },
    ),
    label: (name) => make<T>(
      kind, expected, (value, path) => {
        const problem = check(value, path);
        if (!problem) {
          return null;
        }
        const at = path.length ? path[path.length - 1][1] : '';
        let text: string;
        try {
          text = name(value as T, at);
        } catch {
          return problem; // a value too wrong to name: the path as it is
        }
        return {
          ...problem,
          path: [
            [
              'label',
              text,
            ],
            ...problem.path.slice(path.length),
          ],
        };
      },
    ),
    parse: (value, where) => {
      const problem = check(value, []);
      if (problem) {
        throw new TypeError(`${where}: ${render(problem)}`);
      }
      return value as T;
    },
    safeParse: (value) => {
      const problem = check(value, []);
      return problem ? {
        success: false,
        error: new TypeError(render(problem)),
      } : {
        success: true,
        data: value as T,
      };
    },
  };
  return self;
}

/** A value of `typeof` kind `type`. */
const typed = <T>(type: string, expected: string): TSchema<T> => make<T>(
  type, expected, (value, path) => (typeof value === type ? null : wrong(
    path, expected, value,
  )),
);

/**
 * A string.
 *
 * @example
 * string().parse('/x', WHERE); // => '/x'
 */
export const string = (): TSchema<string> => typed('string', 'a string');

/** `true` or `false`. */
export const boolean = (): TSchema<boolean> => typed('boolean', 'true or false');

/** A function (`function` is a word of the language — zod's `z.function`). */
export const func = (): TSchema<(...args: any[]) => any> => make(
  'function', 'a function', (value, path) => (isFunction(value) ? null : wrong(
    path, 'a function', value,
  )),
);

/** Anything — a field that is the app's own. */
export const unknown = (): TSchema<unknown> => make(
  'unknown', 'anything', () => null,
);

/**
 * A number (not `NaN`); `.min(n)`, `.int()` narrow it.
 *
 * @example
 * number().int().min(0).parse(-1, WHERE); // TypeError: …: expects a whole number ≥ 0, got number -1
 */
export function number(): TNumberSchema {
  const build = (
    min: number | null, int: boolean, finite: boolean,
  ): TNumberSchema => {
    const expected = (int ? 'a whole number' : finite ? 'a finite number' : 'a number') + (min === null ? '' : ` ≥ ${min}`);
    const base = make<number>(
      'number', expected, (value, path) => (typeof value === 'number' && !Number.isNaN(value)
        && (!int || Number.isInteger(value)) && (!finite || Number.isFinite(value)) && (min === null || value >= min)
        ? null : wrong(
          path, expected, value,
        )),
    );
    return {
      ...base,
      min: (n: number) => build(
        n, int, finite,
      ),
      int: () => build(
        min, true, finite,
      ),
      finite: () => build(
        min, int, true,
      ),
    };
  };
  return build(
    null, false, false,
  );
}

/** Exactly `value` (`===`). */
export function literal<const T>(value: T): TSchema<T> {
  const expected = describeValue(value);
  return make<T>(
    'literal', expected, (given, path) => (given === value ? null : wrong(
      path, expected, given,
    )),
  );
}

/**
 * One of the strings `values` — a list, or a function giving it when checked (known later, as a navigator's gates).
 * A string near one of them — "did you mean" (zod's `z.enum`; `enum` is a word of the language).
 *
 * @example
 * oneOf(['onboarding', 'signIn']).parse('onbording', WHERE); // TypeError: …: expects one of onboarding, signIn, got string "onbording". Did you mean "onboarding"?
 */
export function oneOf<const T extends string>(values: readonly T[] | (() => readonly T[])): TSchema<T> {
  return make<T>(
    'oneOf', 'one of the known values', (value, path) => {
      const list = isFunction(values) ? values() : values;
      if (list.includes(value as T)) {
        return null;
      }
      const near = typeof value === 'string' ? nearestOf(value, list) : '';
      return {
        path,
        text: `expects one of ${list.join(', ') || 'none'}, got ${describeValue(value)}${near ? `. Did you mean "${near}"?` : ''}`,
      };
    },
  );
}

/** A value `check` accepts, `expected` naming it in a message (zod's `z.custom`). */
export function custom<T>(check: (value: unknown) => boolean, expected: string): TSchema<T> {
  return make<T>(
    'custom', expected, (value, path) => (check(value) ? null : wrong(
      path, expected, value,
    )),
  );
}

/** One of the schemas (the first that fits). */
export function union<const S extends readonly TSchema<unknown>[]>(schemas: S): TSchema<TInfer<S[number]>> {
  const expected = schemas.map((schema) => schema.expected).join(' or ');
  return make(
    'union', expected, (value, path) => (schemas.some((schema) => !schema.check(value, path)) ? null : wrong(
      path, expected, value,
    )),
  );
}

/**
 * A list of `item`s.
 *
 * @example
 * array(tuple([string(), ROW]).label((row) => `the row "${row[0]}"`))
 */
export function array<T>(item: TSchema<T>): TSchema<T[]> {
  return make<T[]>(
    'array', 'a list', (value, path) => {
      if (!isArray(value)) {
        return wrong(
          path, 'a list', value,
        );
      }
      const length = value.length;
      for (let i = 0; i < length; i++) {
        const problem = item.check(value[i], [
          ...path,
          [
            'index',
            String(i),
          ],
        ]);
        if (problem) {
          return problem;
        }
      }
      return null;
    },
  );
}

/** A list of fixed places: `[pattern, row]`. A place holding an object adds nothing to the path (its keys do). */
export function tuple<const S extends readonly TSchema<unknown>[]>(items: S): TSchema<{ [K in keyof S]: TInfer<S[K]> }> {
  const expected = `a list of ${items.length}`;
  return make(
    'tuple', expected, (value, path) => {
      if (!isArray(value) || value.length > items.length) {
        return wrong(
          path, expected, value,
        );
      }
      const length = items.length;
      for (let i = 0; i < length; i++) {
        const problem = items[i].check(value[i], items[i].kind === 'object' ? path : [
          ...path,
          [
            'index',
            String(i),
          ],
        ]);
        if (problem) {
          return problem;
        }
      }
      return null;
    },
  );
}

/** An object whose values are all `value` — any keys (`{ [name]: gate }`). */
export function record<T>(value: TSchema<T>): TSchema<Record<string, T>> {
  return make(
    'record', 'an object', (given, path) => {
      if (!isObject(given) || isArray(given)) {
        return wrong(
          path, 'an object', given,
        );
      }
      for (const key of Object.keys(given)) {
        const problem = value.check((given as Record<string, unknown>)[key], [
          ...path,
          [
            'key',
            key,
          ],
        ]);
        if (problem) {
          return problem;
        }
      }
      return null;
    },
  );
}

/**
 * An options object of `shape`: a key outside it is an error with "did you mean" (`passthrough()` allows them); a key
 * left `undefined` is absent. `.keys` — the shape's keys.
 *
 * @example
 * const HOST = object({ routes: array(ROW), render: func().optional() });
 * HOST.parse({ routes: [], rendr: draw }, '[fundamentool] NavigationHostProvider');
 * // TypeError: [fundamentool] NavigationHostProvider: unknown option "rendr". Did you mean "render"?
 */
export function object<const S extends Record<string, TSchema<unknown>>>(shape: S): TObjectSchema<S> {
  const keys = Object.keys(shape) as (keyof S & string)[];
  const build = (open: boolean): TObjectSchema<S, any> => {
    const base = make<TObjectOf<S>>(
      'object', 'an options object', (value, path) => {
        if (!isObject(value) || isArray(value)) {
          return wrong(
            path, 'an options object', value,
          );
        }
        const given = value as Record<string, unknown>;
        if (!open) {
          for (const key of Object.keys(given)) {
            if (given[key] !== undefined && !keys.includes(key)) {
              return {
                path,
                text: unknownOptionText(key, keys),
                unknownKey: true,
              };
            }
          }
        }
        for (const key of keys) {
          const problem = shape[key].check(given[key], [
            ...path,
            [
              'key',
              key,
            ],
          ]);
          if (problem) {
            return problem;
          }
        }
        return null;
      },
    );
    // A derived schema (a rule, a label, a description) stays an object schema: its keys, `passthrough`
    const extend = (schema: TSchema<any>): TObjectSchema<S, any> => ({
      ...schema,
      keys,
      passthrough: () => build(true),
      refine: (rule, message) => extend(schema.refine(rule, message)),
      describe: (text) => extend(schema.describe(text)),
      label: (name) => extend(schema.label(name)),
    });
    return extend(base);
  };
  return build(false);
}
