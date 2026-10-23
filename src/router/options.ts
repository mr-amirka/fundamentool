// The options of the router's and the navigator's steps — one schema per kind of step (D-051). Checked on every call
// in development only (lab D-023): built on first use (`lazy`), a production build drops them.
import {
  boolean,
  lazy,
  object,
} from '../schema';

/** `pushLocation` / `replaceLocation` / `startOver`: `quiet`. */
export const STEP_OPTIONS = /*#__PURE__*/ lazy(() => object({
  quiet: boolean().optional(),
}));

/** A step back (`backRepeat`, `backToDepth`): `force`, `quiet`. */
export const BACK_OPTIONS = /*#__PURE__*/ lazy(() => object({
  force: boolean().optional(),
  quiet: boolean().optional(),
}));

/** `params.set` / `remove` / `clear`, `extendLocation`: `replace`, `quiet`. */
export const PARAMS_OPTIONS = /*#__PURE__*/ lazy(() => object({
  replace: boolean().optional(),
  quiet: boolean().optional(),
}));
