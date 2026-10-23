/**
 * lab D-023 (research 13): an app's production build drops fundamentool's checks of options — the checks, their
 * schemas and the schema library — in a dependency, with no setting on the app's side. Bundled here as an app's bundler
 * does it (esbuild, minified, `process.env.NODE_ENV` written in); the development build is the control: everything
 * there. A schema built when its module loads, or a check outside the `NODE_ENV` branch, brings the library back and
 * fails this test.
 */
import {
  buildSync,
} from 'esbuild';
import {
  join,
} from 'path';

/** An app using every entry point that checks options. */
const APP = `
import { createRouter, createNavigator, memoryHistoryPrimitivesProvider } from './src/router';
import { linksProvider, viewHooksProvider } from './src/view';
import { withAsyncLock } from './src/withAsyncLock';
import { createSparseCodec } from './src/SparseCodec';
console.log(createRouter, createNavigator, memoryHistoryPrimitivesProvider, linksProvider, viewHooksProvider,
  withAsyncLock, createSparseCodec);
`;

/** Texts only the schema library and the option checks hold. */
const MARKERS = [
  'an options object',
  'unknown option "',
  'Did you mean',
];

/** The app bundled for `mode`, minified. */
function bundle(mode: string): string {
  const result = buildSync({
    stdin: {
      contents: APP,
      resolveDir: join(__dirname, '..'),
      loader: 'ts',
    },
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

describe('a production build drops the checks of options (lab D-023)', () => {
  it('production: no schema library, no option check; development: both there', () => {
    const production = bundle('production');
    const development = bundle('development');
    expect(MARKERS.filter((marker) => production.includes(marker))).toEqual([]);
    expect(MARKERS.filter((marker) => development.includes(marker))).toEqual(MARKERS);
    expect(production.length).toBeLessThan(development.length);
  });
});
