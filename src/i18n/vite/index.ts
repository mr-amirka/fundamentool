// The Vite plugin of fundamentool/i18n (D-065): builds every set of an app into the compact format — the keys once,
// each locale's values by position — as `virtual:lexicons`; the `inline` locales inside it, the rest as their own
// chunks loaded on demand. The sources stay TypeScript (`<set folder>/<locale>.ts`); a translation whose keys or
// variables differ from its base fails the build. Runs in Node (the build, the dev server).
import {
  existsSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import * as nodeModule from 'node:module';
import path from 'node:path';
import {
  runInNewContext,
} from 'node:vm';
import {
  hashKeys,
} from '../index';
import type {
  TKeyTree,
  TMessages,
  TValues,
} from '../index';
import {
  localeProblems,
} from '../testing';

/** A set of the app: the folder (or `package/subpath`) with its `<locale>.ts` files; the app's rewording of it. */
export type TLexiconSet = {
  /** `./src/i18n`, `@wg/components/i18n` — a folder relative to Vite's root, or a package and a folder in it. */
  from: string;
  /** A folder with the app's rewordings of this set (`<locale>.ts`, any part of the set's tree) — merged over it. */
  override?: string;
};

/** Options of `lexicons()`. */
export type TLexiconsOptions = {
  /** The app's locales; the first is the base. */
  locales: readonly string[];
  /** Set name → its folder; the names are `createMessages(locale, name)`'s. */
  sets: Readonly<Record<string, TLexiconSet>>;
  /** The locales in the main bundle: `'all'`, a list, or — by default — the base only (D-065). */
  inline?: 'all' | readonly string[];
};

/** The part of Vite's plugin API this plugin uses — kept here so fundamentool doesn't depend on Vite. */
export type TVitePlugin = {
  name: string;
  enforce?: 'pre' | 'post';
  configResolved?: (config: { root: string }) => void;
  resolveId?: (id: string) => string | undefined;
  load?: (this: { addWatchFile(file: string): void }, id: string) => Promise<string | undefined>;
  handleHotUpdate?: (context: { file: string }) => void;
};

const VIRTUAL = 'virtual:lexicons';
const RESOLVED = '\0' + VIRTUAL;
const EXTENSIONS = [
  '.ts',
  '.mts',
  '.js',
  '.mjs',
];
const TS_FILE = /\.m?ts$/;
const WHERE = 'lexicons';
const SLASH = '/';
const LIST = ', ';

/** A folder from `from`: relative to the root, or a package found in `node_modules` above the root plus a subpath. */
function folderOf(from: string, root: string): string {
  if (from.startsWith('.') || path.isAbsolute(from)) {
    return path.resolve(root, from);
  }
  const parts = from.split(SLASH);
  const nameLength = from.startsWith('@') ? 2 : 1;
  const name = parts.slice(0, nameLength).join(SLASH);
  for (let dir = root; ; dir = path.dirname(dir)) {
    const candidate = path.join(
      dir, 'node_modules', name,
    );
    if (existsSync(candidate)) {
      return path.join(realpathSync(candidate), ...parts.slice(nameLength));
    }
    if (path.dirname(dir) === dir) {
      throw new Error(`${WHERE}: package "${name}" not found above ${root} (set from "${from}")`);
    }
  }
}

/** The locale file of a folder, if there is one. */
function fileOf(folder: string, locale: string): string | undefined {
  for (const extension of EXTENSIONS) {
    const file = path.join(folder, locale + extension);
    if (existsSync(file)) {
      return file;
    }
  }
  return undefined;
}

/** `export const name =` / `export default` of a messages file — rewritten to assignments for `vm`. */
const EXPORT_CONST = /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_DEFAULT = /^\s*export\s+default\s+/m;
const VALUE_IMPORT = /^\s*import\s+(?!type\b)/m;

/**
 * Reads a messages file: TypeScript stripped of its types by Node (24+), run in a fresh `vm` context; its first
 * exported object. A messages file holds data only — it imports types, never values.
 */
function readMessages(file: string): TMessages {
  const source = readFileSync(file, 'utf8');
  const strip = (nodeModule as unknown as { stripTypeScriptTypes?: (code: string) => string }).stripTypeScriptTypes;
  if (!strip) {
    throw new Error(`${WHERE}: Node 24+ is needed to read ${file} (module.stripTypeScriptTypes)`);
  }
  const code = TS_FILE.test(file) ? strip(source) : source;
  if (VALUE_IMPORT.test(code)) {
    throw new Error(`${WHERE}: ${file} imports values — a messages file holds data only (types may be imported)`);
  }
  const names: string[] = [];
  const body = code.replace(EXPORT_CONST, (whole, name: string) => {
    names.push(name);
    return whole.replace(/export\s+/, '');
  }).replace(EXPORT_DEFAULT, 'exports.default = ');
  const exported: Record<string, unknown> = {};
  runInNewContext(
    body + '\n' + names.map((name) => `exports.${name} = ${name};`).join('\n'), {
      exports: exported,
    },
    {
      filename: file,
    },
  );
  const found = Object.values(exported).find((value) => value && typeof value === 'object');
  if (!found) {
    throw new Error(`${WHERE}: ${file} exports no object of messages`);
  }
  return found as TMessages;
}

/** `target` with `patch` laid over it — only paths that exist in `target` (an override can't add keys). */
function overlay(
  target: TMessages, patch: TMessages, where: string,
): TMessages {
  const result: Record<string, unknown> = {
    ...target,
  };
  for (const name of Object.keys(patch)) {
    if (!(name in target)) {
      throw new Error(`${WHERE}: ${where}.${name} is not in the set it rewords`);
    }
    const value = patch[name];
    result[name] = typeof value === 'string' || Array.isArray(value) ? value :
      overlay(
        target[name] as TMessages, value as TMessages, `${where}.${name}`,
      );
  }
  return result as TMessages;
}

function flatten(
  messages: TMessages, tree: (string | readonly [string, TKeyTree])[], values: TValues[number][],
): void {
  for (const name of Object.keys(messages)) {
    const value = messages[name];
    if (typeof value === 'string' || Array.isArray(value)) {
      tree.push(name);
      values.push(value as string | readonly string[]);
    } else {
      const children: (string | readonly [string, TKeyTree])[] = [];
      tree.push([
        name,
        children,
      ]);
      flatten(
        value as TMessages, children, values,
      );
    }
  }
}

function valuesOf(
  tree: TKeyTree, messages: TMessages | undefined, out: TValues[number][],
): void {
  for (const node of tree) {
    if (typeof node === 'string') {
      const value = messages?.[node];
      out.push(typeof value === 'string' || Array.isArray(value) ? value as string | readonly string[] : null);
    } else {
      valuesOf(
        node[1], messages?.[node[0]] as TMessages | undefined, out,
      );
    }
  }
}

/** Everything the plugin emits, built from the files: the hash, the keys, every locale's values; the files read. */
type TBuilt = { hash: string;
  keys: (readonly [string, TKeyTree])[];
  values: Record<string, TValues>;
  files: string[] };

async function build(options: TLexiconsOptions, root: string): Promise<TBuilt> {
  const {
    locales, sets,
  } = options;
  const base = locales[0];
  const files: string[] = [];
  const keys: (readonly [string, TKeyTree])[] = [];
  const values: Record<string, TValues[number][]> = {};
  for (const locale of locales) {
    values[locale] = [];
  }
  const problems: string[] = [];
  for (const name of Object.keys(sets)) {
    const set = sets[name];
    const folder = folderOf(set.from, root);
    const overrideFolder = set.override ? folderOf(set.override, root) : undefined;
    const baseFile = fileOf(folder, base);
    if (!baseFile) {
      throw new Error(`${WHERE}: set "${name}" has no base file ${base}.ts in ${folder}`);
    }
    files.push(baseFile);
    const byLocale: Record<string, TMessages | undefined> = {};
    for (const locale of locales) {
      const file = fileOf(folder, locale);
      if (file && file !== baseFile) {
        files.push(file);
      }
      let messages = file ? readMessages(file) : undefined;
      const translation = locale !== base;
      if (messages && translation) {
        problems.push(...localeProblems(
          byLocale[base] as TMessages, messages, `${name}/${locale}`,
        ));
      }
      const overrideFile = overrideFolder ? fileOf(overrideFolder, locale) : undefined;
      if (overrideFile && messages) {
        files.push(overrideFile);
        messages = overlay(
          messages, readMessages(overrideFile), `${name} override ${locale}`,
        );
      }
      byLocale[locale] = messages;
      if (!messages && translation) {
        problems.push(`${name}/${locale}: no file ${locale}.ts in ${folder}`);
      }
    }
    const tree: (string | readonly [string, TKeyTree])[] = [];
    flatten(
      byLocale[base] as TMessages, tree, values[base],
    );
    keys.push([
      name,
      tree,
    ]);
    for (const locale of locales.slice(1)) {
      valuesOf(
        tree, byLocale[locale], values[locale],
      );
    }
  }
  if (problems.length) {
    throw new Error(`${WHERE}: the translations differ from their base — ${problems.length} problem(s):\n  ` +
      problems.join('\n  '));
  }
  return {
    hash: hashKeys(keys),
    keys,
    values,
    files,
  };
}

/**
 * The Vite plugin (D-065): `virtual:lexicons` — the compact source for `createLocale`.
 *
 * @example
 * // vite.config.ts
 * plugins: [lexicons({ locales: LOCALES, sets: { game: { from: './src/i18n' } }, inline: 'all' })]
 * // app/i18n.ts
 * import source from 'virtual:lexicons';
 * export const locale = createLocale({ source, locales: LOCALES });
 */
export function lexicons(options: TLexiconsOptions): TVitePlugin {
  const {
    locales,
  } = options;
  if (!locales.length) {
    throw new Error(`${WHERE}: \`locales\` is empty — the first one is the base`);
  }
  if (!Object.keys(options.sets).length) {
    throw new Error(`${WHERE}: \`sets\` is empty`);
  }
  const unknownInline = Array.isArray(options.inline) ? options.inline.filter((locale) => !locales.includes(locale)) : [];
  if (unknownInline.length) {
    throw new Error(`${WHERE}: \`inline\` has ${unknownInline.join(LIST)} — not in \`locales\` (${locales.join(LIST)})`);
  }
  const inline = new Set(options.inline === 'all' ? locales : [
    locales[0],
    ...options.inline || [],
  ]);
  let root = process.cwd();
  let built: Promise<TBuilt> | undefined;
  /** The files the last build read — a change in one rebuilds on the next load. */
  let watched = new Set<string>();

  return {
    name: 'fundamentool:lexicons',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === VIRTUAL || id.startsWith(VIRTUAL + SLASH) ? '\0' + id : undefined;
    },
    async load(id) {
      if (!id.startsWith(RESOLVED)) {
        return undefined;
      }
      built ??= build(options, root);
      const {
        hash, keys, values, files,
      } = await built;
      watched = new Set(files);
      for (const file of files) {
        this.addWatchFile(file);
      }
      if (id === RESOLVED) {
        const inlined = Object.fromEntries(locales.filter((locale) => inline.has(locale)).map((locale) =>
          [
            locale,
            values[locale],
          ]));
        const loaders = locales.filter((locale) => !inline.has(locale)).map((locale) =>
          `${JSON.stringify(locale)}: () => import(${JSON.stringify(`${VIRTUAL}/${locale}`)})`);
        return `const loaders = {${loaders.join(LIST)}};
export default {
  hash: ${JSON.stringify(hash)},
  keys: ${JSON.stringify(keys)},
  values: ${JSON.stringify(inlined)},
  load: (locale) => loaders[locale] ? loaders[locale]().then((m) => m.default) : Promise.reject(new Error('no locale ' + locale)),
};
`;
      }
      const locale = id.slice(RESOLVED.length + 1);
      return `export default { hash: ${JSON.stringify(hash)}, values: ${JSON.stringify(values[locale] ?? [])} };\n`;
    },
    handleHotUpdate({
      file,
    }) {
      if (watched.has(file)) {
        built = undefined;
      }
    },
  };
}
