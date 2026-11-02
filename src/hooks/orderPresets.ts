import {
  describeValue,
} from '../describeValue';
import {
  isArray,
} from '../is/isArray';
import {
  WHERE,
  checkOrderOptions,
} from './options';
import type {
  TOrderPresetsOptions,
  TPreset,
  TPresetObject,
} from './types';

// Moved from minotation's `packages/core/src/core/presetOrder.ts` (minotation D-045) — fundamentool D-087. Until
// minotation calls this one, its copy stays: the switch is the entry of 2026-10-31 in
// `LABARATORY/PROJECTS_CONTEXT/minotation/TASKS/main/INBOX.md` (`no-parallel-legacy.md`).

/** Being visited now (to find a cycle) / already in the result. */
const VISITING = 0;
const PLACED = 1;

function presetObjectOf(preset: unknown, fail: (text: string) => never): TPresetObject<unknown> {
  if (preset === null || typeof preset !== 'object') {
    fail(`expects a preset — a function or { name, setup } — got ${describeValue(preset)}`);
  }
  const object = preset as TPresetObject<unknown>;
  const named = typeof object.name === 'string' && object.name !== '';
  const where = named ? `preset "${object.name}"` : 'preset object';
  if (!named) {
    fail(`${where}: a preset object needs a "name"`);
  }
  if (typeof object.setup !== 'function') {
    fail(`${where}: a preset object needs a "setup(host)" function`);
  }
  const requires = object.requires;
  if (requires !== undefined && !(isArray(requires) && requires.every((name) => typeof name === 'string'))) {
    fail(`${where}: "requires" expects a list of preset names, got ${describeValue(requires)}`);
  }
  return object;
}

/**
 * Orders presets so that each is set up after the presets it `requires`. The order is stable: other things equal, as
 * listed (a preset lower in the list overrides the ones above it); a dependency moves up only as far as it must. A
 * function preset has no name and stays in its place. Checks `name`, `requires` and `setup` only — a host checks its own
 * fields with its own schema (lab D-044: nothing of a domain in the core).
 *
 * @param presets - The list, as the host was given it.
 * @param options - `connected`: presets set up by earlier calls, by name; `where`: the prefix of a message.
 * @returns The presets in the order to set them up; an object already in `connected` is left out.
 * @throws {TypeError} not a list; a preset that isn't one; a `requires` not connected; presets requiring each other;
 * two different presets with one name — all before any `setup` runs.
 * @example
 * orderPresets([presetMain, presetHints, presetStandard]);
 * // => [presetHints, presetStandard, presetMain] — presetMain requires the other two
 */
export function orderPresets<P extends TPreset<any>>(presets: readonly P[], options?: TOrderPresetsOptions): P[] {
  const where = options?.where || `${WHERE} orderPresets`;
  checkOrderOptions(options, where);
  const connected: Readonly<Record<string, object>> = options?.connected || {};
  const fail = (text: string): never => {
    throw new TypeError(`${where}: ${text}`);
  };
  if (!isArray(presets)) {
    fail(`expects a list of presets, got ${describeValue(presets)}`);
  }
  const byName: Record<string, TPresetObject<unknown>> = {};
  for (const preset of presets) {
    if (typeof preset !== 'function') {
      const object = presetObjectOf(preset, fail);
      const known = byName[object.name] || connected[object.name];
      if (known && known !== object) {
        fail(`two different presets are named "${object.name}"`);
      }
      byName[object.name] = object;
    }
  }
  const out: P[] = [];
  const state = new Map<unknown, number>();
  const visit = (item: P, path: string[]): void => {
    const mark = state.get(item);
    if (mark === PLACED) {
      return;
    }
    if (typeof item === 'function') {
      state.set(item, PLACED);
      out.push(item);
      return;
    }
    const object = item as TPresetObject<unknown>;
    if (mark === VISITING) {
      fail(`presets require each other: ${path.slice(path.indexOf(object.name)).concat(object.name).join(' → ')}`);
    }
    state.set(item, VISITING);
    for (const name of object.requires || []) {
      if (byName[name]) {
        visit(byName[name] as P, path.concat(object.name));
      } else if (!connected[name]) {
        fail(`${object.name} requires "${name}", which is not connected. Connected presets: ${Object.keys(connected).concat(Object.keys(byName)).join(', ')}`);
      }
    }
    state.set(item, PLACED);
    // An object connected by an earlier call isn't set up again.
    if (connected[object.name] !== item) {
      out.push(item);
    }
  };
  for (const preset of presets) {
    visit(preset, []);
  }
  return out;
}

/**
 * A preset's setup, whichever its form: the function itself, or the object's `setup`.
 *
 * @param preset - A function of the host or `{ name, setup }`.
 * @returns `(host) => void`.
 * @example
 * for (const preset of orderPresets(presets)) presetSetup(preset)(host);
 */
export function presetSetup<H>(preset: TPreset<H>): (host: H) => void {
  return typeof preset === 'function' ? preset : (host) => preset.setup(host);
}
