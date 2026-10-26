/**
 * Smoke test of the built package as plain Node sees it.
 *
 * For every entry of `package.json#exports` it loads the package by its own
 * name (self-reference, so the real `exports` map is used) twice — through the
 * ESM loader (`import`) and through `require` — and checks that both formats
 * expose the same, non-empty set of names. Browser-only entries touch `window`
 * and `document` at load time, so they run last, against a minimal stub.
 * Then every relative specifier in `dist/esm` is checked to point at an
 * existing file — this also covers files no entry point reaches — every
 * subpath's `typesVersions` entry to name the same types file as `exports`, and
 * every entry's `module` condition (bundlers) to name its `import` file.
 *
 * Usage: `node scripts/check-dist.mjs` (after `node scripts/build.mjs`)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  createRequire,
} from 'node:module';
import {
  fileURLToPath,
} from 'node:url';

const ENCODING = 'utf8';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), ENCODING));
const require = createRequire(import.meta.url);
const esmRoot = fileURLToPath(new URL('../dist/esm', import.meta.url));
const failures = [];
const isBrowser = (subpath) => subpath.includes('browser');
const subpaths = Object.keys(pkg.exports).filter((subpath) => !isBrowser(subpath))
  .concat(Object.keys(pkg.exports).filter(isBrowser));

/** Installs the few DOM globals browser entries read while loading. */
function stubBrowserGlobals() {
  const noop = () => undefined;
  globalThis.window = globalThis;
  globalThis.addEventListener = noop;
  globalThis.removeEventListener = noop;
  globalThis.document = {
    readyState: 'complete',
    addEventListener: noop,
    removeEventListener: noop,
  };
}

/**
 * Lists `.js` files under a folder, recursively.
 *
 * @param dir - Absolute folder path.
 * @returns Absolute file paths.
 */
function listJs(dir) {
  return fs.readdirSync(dir, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? listJs(file) : entry.name.endsWith('.js') ? [file] : [];
  });
}

for (const subpath of subpaths) {
  if (isBrowser(subpath) && !globalThis.window) {
    stubBrowserGlobals();
  }
  const id = pkg.name + subpath.slice(1);
  try {
    const esm = Object.keys(await import(id)).filter((key) => key !== 'default').sort();
    const cjs = Object.keys(require(id)).filter((key) => key !== 'default' && key !== '__esModule').sort();
    const onlyEsm = esm.filter((key) => !cjs.includes(key));
    const onlyCjs = cjs.filter((key) => !esm.includes(key));
    if (!esm.length) {
      failures.push(`${id}: no exports`);
    }
    if (onlyEsm.length) {
      failures.push(`${id}: only in ESM: ${onlyEsm.join(', ')}`);
    }
    if (onlyCjs.length) {
      failures.push(`${id}: only in CJS: ${onlyCjs.join(', ')}`);
    }
    process.stdout.write(`${id}: ${esm.length} exports\n`);
  } catch (error) {
    failures.push(`${id}: ${error.message}`);
  }
}

// Statements emitted by tsc start a line; comment lines (` * `, `//`) are skipped,
// so `import('./x')` in a JSDoc example is not taken for code.
const specifierPattern = /^(?:(?:import|export)\b[^;]*?\bfrom\s*|import\s*|(?!\s*(?:\*|\/\/)).*?\bimport\(\s*)(['"])(\.\.?\/[^'"]*)\1/gm;
for (const file of listJs(esmRoot)) {
  for (const match of fs.readFileSync(file, ENCODING).matchAll(specifierPattern)) {
    const target = path.resolve(path.dirname(file), match[2]);
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      failures.push(`${path.relative(esmRoot, file)}: '${match[2]}' is not a file`);
    }
  }
}

// Bundlers take `sideEffects` from the nearest package.json — the ES modules' own must say what the package says.
const esmPkg = JSON.parse(fs.readFileSync(path.join(esmRoot, 'package.json'), ENCODING));
if (JSON.stringify(esmPkg.sideEffects) !== JSON.stringify(pkg.sideEffects)) {
  failures.push(`dist/esm/package.json: "sideEffects" is ${JSON.stringify(esmPkg.sideEffects)}, the package's is ${JSON.stringify(pkg.sideEffects)}`);
}

// TypeScript's older resolution (`moduleResolution: node10` — every Jest config compiling to CommonJS) ignores `exports`:
// it finds a subpath's types only through `typesVersions`, which must name the same file as `exports`.
const typesVersions = pkg.typesVersions?.['*'] ?? {};
for (const subpath of Object.keys(pkg.exports).filter((key) => key !== '.')) {
  const types = pkg.exports[subpath].types.replace(/^\.\//, '');
  const listed = typesVersions[subpath.slice(2)];
  if (JSON.stringify(listed) !== JSON.stringify([types])) {
    failures.push(`typesVersions["${subpath.slice(2)}"] is ${JSON.stringify(listed)}, exports' types are ${JSON.stringify([types])}`);
  } else if (!fs.existsSync(new URL(`../${types}`, import.meta.url))) {
    failures.push(`${types}: no such file (typesVersions["${subpath.slice(2)}"])`);
  }
}

// Bundlers read the `module` condition and Node doesn't: a bundler gets the ES modules for `require` too (a CommonJS
// library's `require('react')`, aliased to `fundamentool/vdom/react`, fundamentool D-073) — one copy in a bundle, and
// no CommonJS file outside `node_modules`, which Vite doesn't convert. Each entry's `module` names its `import` file.
for (const subpath of Object.keys(pkg.exports)) {
  const entry = pkg.exports[subpath];
  if (entry.module !== entry.import) {
    failures.push(`exports["${subpath}"].module is ${JSON.stringify(entry.module)}, its import is ${JSON.stringify(entry.import)}`);
  }
}

if (failures.length) {
  process.stderr.write(failures.join('\n') + '\n');
  process.exit(1);
}
