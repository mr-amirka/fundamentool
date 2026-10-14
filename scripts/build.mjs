/**
 * Builds `dist/` (CommonJS) and `dist/esm/` (ES modules) from `src/`.
 *
 * The ESM output is loadable by plain Node, not only by bundlers: relative
 * specifiers are rewritten to explicit files (`./x` → `./x.js` or
 * `./x/index.js`), and `dist/esm/package.json` marks the folder as
 * `"type": "module"`. A specifier that resolves to no source file fails the
 * build instead of being emitted as is.
 *
 * Usage: `node scripts/build.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const sourceExtensions = ['.ts', '.tsx'];

/**
 * Turns an extensionless relative specifier into one Node's ESM loader accepts.
 *
 * @param fromFile - Absolute path of the importing source file.
 * @param specifier - Specifier as written in the source, e.g. `./EventEmitter`.
 * @returns The specifier with an explicit target, e.g. `./EventEmitter/index.js`.
 * @throws If the specifier points at neither a source file nor a folder with `index`.
 * @example
 * resolveSpecifier('/src/index.ts', './flags'); // './flags.js'
 * resolveSpecifier('/src/index.ts', './EventEmitter'); // './EventEmitter/index.js'
 */
function resolveSpecifier(fromFile, specifier) {
  if (specifier.endsWith('.js') || specifier.endsWith('.json')) {
    return specifier;
  }
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const ext of sourceExtensions) {
    if (fs.existsSync(base + ext)) {
      return specifier + '.js';
    }
  }
  for (const ext of sourceExtensions) {
    if (fs.existsSync(path.join(base, 'index' + ext))) {
      return specifier.replace(/\/$/, '') + '/index.js';
    }
  }
  throw new Error(`Cannot resolve '${specifier}' imported from ${path.relative(root, fromFile)}`);
}

/**
 * `after` transformer: rewrites relative specifiers of `import`/`export ... from`
 * declarations and of `import('literal')` calls.
 *
 * @param context - Transformation context supplied by the compiler.
 * @returns Source file transformer.
 */
function explicitSpecifiers(context) {
  const factory = context.factory;
  return (sourceFile) => {
    const rewrite = (node) => {
      const text = node.text;
      return text.startsWith('./') || text.startsWith('../') || text === '.' || text === '..'
        ? factory.createStringLiteral(resolveSpecifier(sourceFile.fileName, text), true)
        : node;
    };
    const visit = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        return factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          rewrite(node.moduleSpecifier),
          node.attributes,
        );
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        return factory.updateExportDeclaration(
          node,
          node.modifiers,
          node.isTypeOnly,
          node.exportClause,
          rewrite(node.moduleSpecifier),
          node.attributes,
        );
      }
      if (
        ts.isCallExpression(node)
        && node.expression.kind === ts.SyntaxKind.ImportKeyword
        && node.arguments.length
        && ts.isStringLiteral(node.arguments[0])
      ) {
        return factory.updateCallExpression(
          node,
          node.expression,
          node.typeArguments,
          [rewrite(node.arguments[0])].concat(node.arguments.slice(1)),
        );
      }
      return ts.visitEachChild(
        node, visit, context,
      );
    };
    return ts.visitNode(sourceFile, visit);
  };
}

/**
 * Compiles one tsconfig and exits the process on any diagnostic.
 *
 * @param configName - Tsconfig file name relative to the package root.
 * @param transformers - Custom transformers passed to `program.emit`.
 */
function compile(configName, transformers) {
  const config = ts.getParsedCommandLineOfConfigFile(
    path.join(root, configName), {}, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => report([diagnostic]),
    },
  );
  if (config.errors.length) {
    report(config.errors);
  }
  const program = ts.createProgram({
    rootNames: config.fileNames,
    options: config.options,
    projectReferences: config.projectReferences,
  });
  const result = program.emit(
    undefined, undefined, undefined, false, transformers,
  );
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
  if (diagnostics.length) {
    report(diagnostics);
  }
}

/**
 * Prints diagnostics in `tsc` format and exits with code 1.
 *
 * @param diagnostics - Compiler diagnostics.
 */
function report(diagnostics) {
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  }));
  process.exit(1);
}

fs.rmSync(dist, {
  recursive: true,
  force: true,
});
compile('tsconfig.json');
compile('tsconfig.esm.json', {
  after: [explicitSpecifiers],
});
fs.writeFileSync(path.join(
  dist, 'esm', 'package.json',
), JSON.stringify(
  {
    type: 'module',
  }, null, 2,
) + '\n');
