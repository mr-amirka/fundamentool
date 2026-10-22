// The options of the router's and the navigator's steps — one schema per kind of step (D-051), checked on every call
// (api-input-validation.md; the steps are user actions — not a hot path).
import {
  boolean,
  object,
} from '../schema';

/** `pushLocation` / `replaceLocation` / `startOver`: `quiet`. */
const STEP = object({
  quiet: boolean().optional(),
});

/** A step back (`backRepeat`, `backToDepth`): `force`, `quiet`. */
const BACK = object({
  force: boolean().optional(),
  quiet: boolean().optional(),
});

/** `params.set` / `remove` / `clear`, `extendLocation`: `replace`, `quiet`. */
const PARAMS = object({
  replace: boolean().optional(),
  quiet: boolean().optional(),
});

/** A step's options: left out, or the known flags, each `true` or `false`. */
export const STEP_OPTIONS = STEP.optional();
/** A step back's options. */
export const BACK_OPTIONS = BACK.optional();
/** The query's steps' options. */
export const PARAMS_OPTIONS = PARAMS.optional();

/** The single list of `pushLocation` / `replaceLocation`'s option keys. */
export const STEP_OPTION_KEYS = STEP.keys;
/** The single list of `backRepeat` / `backToDepth`'s option keys. */
export const BACK_OPTION_KEYS = BACK.keys;
/** The single list of `params.set` / `remove` / `clear`'s option keys. */
export const PARAMS_OPTION_KEYS = PARAMS.keys;
