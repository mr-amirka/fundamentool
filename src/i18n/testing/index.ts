// Checks of a set's translations (research 03 §5.15) — for a package's tests (`checkSet`) and the Vite plugin, which
// fails the build on the same problems.
import type {
  TMessages,
} from '../index';

const VARIABLES = /\{\{\s*([^}|\s]+)[^}]*\}\}/g;
const PLURAL = /\{\{\s*[^}|\s]+\s*\|\s*(zero|one|two|few|many|other)\s*:/;

/** The names of a template's variables, sorted: `'{{count|one:#}} in {{level}}'` → `['count', 'level']`. */
function variablesOf(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(VARIABLES)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

/** Every leaf of a tree with its path. */
function leaves(
  messages: TMessages, prefix: string, out: Map<string, string | readonly string[]>,
): void {
  for (const name of Object.keys(messages)) {
    const value = messages[name];
    const path = prefix + name;
    if (typeof value === 'string' || Array.isArray(value)) {
      out.set(path, value as string | readonly string[]);
    } else {
      leaves(
        value as TMessages, path + '.', out,
      );
    }
  }
}

/** One template's own problems: empty; a plural without `other`. */
function templateProblems(template: string, where: string): string[] {
  const problems: string[] = [];
  if (!template.trim()) {
    problems.push(`${where}: empty text`);
  }
  if (PLURAL.test(template) && !/\|\s*other\s*:/.test(template)) {
    problems.push(`${where}: a plural without "other"`);
  }
  return problems;
}

/**
 * The problems of a translation against its base: missing and extra keys, a text where the base has a list (or the
 * reverse), different variables, an empty text, a plural without `other`, an empty list.
 *
 * @example
 * localeProblems({ hud: { moves: '{{count|one:# move|other:# moves}}' } }, { hud: { moves: '# ходов' } }, 'ru');
 * // ['ru: hud.moves: variables count ≠ (none)']
 */
export function localeProblems(
  base: TMessages, translation: TMessages, locale: string,
): string[] {
  const baseLeaves = new Map<string, string | readonly string[]>();
  const ownLeaves = new Map<string, string | readonly string[]>();
  leaves(
    base, '', baseLeaves,
  );
  leaves(
    translation, '', ownLeaves,
  );
  const problems: string[] = [];
  for (const [
    path,
    baseValue,
  ] of baseLeaves) {
    const where = `${locale}: ${path}`;
    const value = ownLeaves.get(path);
    if (value === undefined) {
      problems.push(`${where}: missing`);
      continue;
    }
    if (Array.isArray(baseValue) !== Array.isArray(value)) {
      problems.push(`${where}: ${Array.isArray(baseValue) ? 'a list expected' : 'a text expected'}`);
      continue;
    }
    const items = (Array.isArray(value) ? value : [value]) as string[];
    const baseItems = (Array.isArray(baseValue) ? baseValue : [baseValue]) as string[];
    if (!items.length) {
      problems.push(`${where}: an empty list`);
    }
    const expected = variablesOf(baseItems.join(' ')).join(', ') || '(none)';
    for (const item of items) {
      const got = variablesOf(item).join(', ') || '(none)';
      if (got !== expected) {
        problems.push(`${where}: variables ${got} ≠ ${expected}`);
      }
      problems.push(...templateProblems(item, where));
    }
  }
  for (const path of ownLeaves.keys()) {
    if (!baseLeaves.has(path)) {
      problems.push(`${locale}: ${path}: not in the base`);
    }
  }
  return problems;
}

/**
 * Checks a set's locales (research 03 §5.15): the base's own texts, and every translation against it — throws one error
 * listing every problem. One call in a package's tests.
 *
 * @param locales - `{ [locale]: messages }`; the base first.
 *
 * @example
 * test('every locale of the game', () => {
 *   checkSet({ en, ru, de });
 * });
 */
export function checkSet(locales: Readonly<Record<string, TMessages>>): void {
  const names = Object.keys(locales);
  const base = locales[names[0]];
  const problems: string[] = [];
  const baseLeaves = new Map<string, string | readonly string[]>();
  leaves(
    base, '', baseLeaves,
  );
  for (const [
    path,
    value,
  ] of baseLeaves) {
    for (const item of (Array.isArray(value) ? value : [value]) as string[]) {
      problems.push(...templateProblems(item, `${names[0]}: ${path}`));
    }
  }
  for (const locale of names.slice(1)) {
    problems.push(...localeProblems(
      base, locales[locale], locale,
    ));
  }
  if (problems.length) {
    throw new Error(`checkSet: ${problems.length} problem(s)\n  ` + problems.join('\n  '));
  }
}
