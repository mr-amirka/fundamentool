import type * as ts from 'typescript';
import {
  matchesName,
} from './names';
import {
  STRING_PLACES,
  attrRegExp,
  readAttrs,
} from './sourceStringsProvider';
import type {
  TSourceRange,
  TStringPlaces,
  TStringPush,
} from './types';

/** TypeScript's module (`import ts from 'typescript'`): the caller's, fundamentool imports none. */
export type TTypeScript = typeof ts;

/** Reads a parsed file's strings at its places into `out`. */
export type TSyntaxStrings = <O extends unknown[]>(file: ts.SourceFile, out: O, push: TStringPush<O>) => void;

const WHERE = '[fundamentool/source] ';
const ASTERISK = '*';

/** In development: the module given is TypeScript's. */
function checkTypeScript(module: TTypeScript, where: string): void {
  if (!module || typeof module.createSourceFile !== 'function' || typeof module.forEachChild !== 'function') {
    throw new TypeError(WHERE + where + ': expects TypeScript\'s module (the typescript package), got '
      + (module === null ? 'null' : typeof module));
  }
}

/**
 * Parses a file into a tree, or gives `undefined` when it has a syntax error: TypeScript returns a tree for a broken
 * file as if nothing were wrong, and a reader of it would miss what the error hides. The caller decides what to do
 * then (minotation reads the file as text).
 *
 * The dialect is the file's: `.ts`, `.mts`, `.cts` — TS with no JSX (there `<T>` is a type cast); anything else — TSX,
 * which reads a superset of JS, JSX and TS. No types are checked; the parents aren't set (a walk goes from the top).
 *
 * @param typescript - TypeScript's module
 * @param source - the file's text
 * @param fileName - its name, for the dialect
 * @returns the tree, or `undefined` for a file with a syntax error
 *
 * @example
 * import ts from 'typescript';
 * parseSource(ts, '<b className="p10" />', 'App.tsx');   // => a SourceFile
 * parseSource(ts, 'const a = (', 'a.ts');                // => undefined
 */
export function parseSource(
  typescript: TTypeScript, source: string, fileName = 'source.tsx',
): ts.SourceFile | undefined {
  if (process.env.NODE_ENV !== 'production') {
    checkTypeScript(typescript, 'parseSource');
  }
  const dot = fileName.lastIndexOf('.');
  const ext = dot > -1 ? fileName.slice(dot) : '';
  const file = typescript.createSourceFile(
    fileName,
    source,
    typescript.ScriptTarget.Latest,
    false,
    ext === '.ts' || ext === '.mts' || ext === '.cts' ? typescript.ScriptKind.TS : typescript.ScriptKind.TSX,
  );
  // `parseDiagnostics` isn't in the public types, but it is the only way to learn of a syntax error without building a
  // program.
  const problems = (file as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
  return problems && problems.length ? undefined : file;
}

/** What marks an attribute in markup inside a string: `className=` for a name, `ClassName=` for a pattern. */
function markupOf(pattern: string): string {
  return (pattern[0] === ASTERISK ? pattern.slice(1) : pattern) + '=';
}

/**
 * A reader of a parsed file's strings at its places, made once — the parser's twin of `sourceStringsProvider`, with
 * the same places and the same rule of what an expression can be:
 *
 * - **attrs** — a JSX attribute (`className="p10"`, `className={on ? 'a' : 'b'}`) and an object key
 *   (`{ className: 'p10' }`); markup inside a string or a template (`` html`<div class="p10">` ``) as text;
 * - **variables** — `const rowClass = 'p10'` (with a type too) and an object key `{ rowClass: 'p10' }`;
 * - **calls** — every string of a call's arguments, nested ones included; the callee a bare name (`obj.mne(…)` is
 *   another method).
 *
 * Unlike the text, the tree has no comments to blank and no strings to mistake. A string is pushed as its value
 * (escapes read). The reader is safe to call again from inside `push`.
 *
 * @param typescript - TypeScript's module
 * @param places - the names and `*Ending` patterns of each place
 * @returns the reader `(file, out, push) => void`; the file from {@link parseSource}
 * @throws {TypeError} in development, on a module that isn't TypeScript's, an unknown key or a wrong value
 *
 * @example
 * import ts from 'typescript';
 * const strings = syntaxStringsProvider(ts, { attrs: ['className'], variables: ['*Class'], calls: ['mne'] });
 * const out: string[] = [];
 * strings(parseSource(ts, 'const aClass = on ? "p10" : "p5";')!, out, (list, text) => list.push(text));
 * // out: ['p10', 'p5']
 */
export function syntaxStringsProvider(typescript: TTypeScript, places: TStringPlaces): TSyntaxStrings {
  if (process.env.NODE_ENV !== 'production') {
    checkTypeScript(typescript, 'syntaxStringsProvider');
    STRING_PLACES().parse(places, WHERE + 'syntaxStringsProvider');
  }
  const kinds = typescript.SyntaxKind;
  const JSX_ATTRIBUTE = kinds.JsxAttribute;
  const JSX_EXPRESSION = kinds.JsxExpression;
  const PROPERTY_ASSIGNMENT = kinds.PropertyAssignment;
  const VARIABLE_DECLARATION = kinds.VariableDeclaration;
  const CALL_EXPRESSION = kinds.CallExpression;
  const STRING_LITERAL = kinds.StringLiteral;
  const PLAIN_TEMPLATE = kinds.NoSubstitutionTemplateLiteral;
  const TEMPLATE = kinds.TemplateExpression;
  const CONDITIONAL = kinds.ConditionalExpression;
  const PARENTHESIZED = kinds.ParenthesizedExpression;
  const BINARY = kinds.BinaryExpression;
  const IDENTIFIER = kinds.Identifier;
  const AND = kinds.AmpersandAmpersandToken;
  const OR = kinds.BarBarToken;
  const NULLISH = kinds.QuestionQuestionToken;
  const forEachChild = typescript.forEachChild;
  const attrs = places.attrs || [];
  const variables = places.variables || [];
  const calls = places.calls || [];
  const markups = attrs.map(markupOf);
  // One list per pattern: markup inside a string is read for the patterns whose mark it holds.
  const markupRegExps = attrs.map((pattern) => [attrRegExp(pattern)]);
  const markupsLength = markups.length;
  // The walk's list and push: set per file, so the walk passes no state to each node and makes no function per node.
  let out: unknown[] = [];
  let push: TStringPush<unknown[]>;

  /** The name of a node as a string; a computed name is none. */
  function nameOf(node: ts.Node): string {
    const kind = node.kind;
    return kind === IDENTIFIER || kind === STRING_LITERAL ? (node as ts.Identifier | ts.StringLiteral).text : '';
  }

  /** Every node: a place, a call, or a string that may hold markup. */
  function visit(node: ts.Node): void {
    const kind = node.kind;
    if (kind === JSX_ATTRIBUTE) {
      if (matchesName(nameOf((node as ts.JsxAttribute).name), attrs)) {
        const value = (node as ts.JsxAttribute).initializer;
        value && expression(value.kind === JSX_EXPRESSION ? (value as ts.JsxExpression).expression : value);
      }
    } else if (kind === PROPERTY_ASSIGNMENT) {
      const name = nameOf((node as ts.PropertyAssignment).name);
      (matchesName(name, attrs) || matchesName(name, variables))
        && expression((node as ts.PropertyAssignment).initializer);
    } else if (kind === VARIABLE_DECLARATION) {
      matchesName(nameOf((node as ts.VariableDeclaration).name), variables)
        && expression((node as ts.VariableDeclaration).initializer);
    } else if (kind === CALL_EXPRESSION) {
      const callee = (node as ts.CallExpression).expression;
      if (callee.kind === IDENTIFIER && matchesName((callee as ts.Identifier).text, calls)) {
        const args = (node as ts.CallExpression).arguments;
        const l = args.length;
        let i = 0;
        for (; i < l; i++) {
          everyString(args[i]);
        }
      }
    } else if (kind === STRING_LITERAL || kind === PLAIN_TEMPLATE) {
      markup((node as ts.StringLiteralLike).text);
    } else if (kind === TEMPLATE) {
      markup((node as ts.TemplateExpression).head.text);
      const spans = (node as ts.TemplateExpression).templateSpans;
      const l = spans.length;
      let i = 0;
      for (; i < l; i++) {
        markup(spans[i].literal.text);
      }
    }
    forEachChild(node, visit);
  }

  /** The strings an expression can be: both branches of `?:`, the right of `&&`, both of `||` and `??`. */
  function expression(node: ts.Node | undefined): void {
    if (!node) {
      return;
    }
    const kind = node.kind;
    if (kind === CONDITIONAL) {
      expression((node as ts.ConditionalExpression).whenTrue);
      expression((node as ts.ConditionalExpression).whenFalse);
    } else if (kind === PARENTHESIZED) {
      expression((node as ts.ParenthesizedExpression).expression);
    } else if (kind === BINARY) {
      const operator = (node as ts.BinaryExpression).operatorToken.kind;
      if (operator === AND) {
        expression((node as ts.BinaryExpression).right);
      } else if (operator === OR || operator === NULLISH) {
        expression((node as ts.BinaryExpression).left);
        expression((node as ts.BinaryExpression).right);
      }
    } else {
      // A call, a name, a concatenation: known only at run time — nothing, as in the text.
      literal(node);
    }
  }

  /** A string or a template: its strings. */
  function literal(node: ts.Node): void {
    const kind = node.kind;
    if (kind === STRING_LITERAL || kind === PLAIN_TEMPLATE) {
      push(out, (node as ts.StringLiteralLike).text);
    } else if (kind === TEMPLATE) {
      push(out, (node as ts.TemplateExpression).head.text);
      const spans = (node as ts.TemplateExpression).templateSpans;
      const l = spans.length;
      let i = 0;
      for (; i < l; i++) {
        expression(spans[i].expression);
        push(out, spans[i].literal.text);
      }
    }
  }

  /** Every string of a subtree: a call's arguments. */
  function everyString(node: ts.Node): void {
    literal(node);
    forEachChild(node, everyString);
  }

  /** Markup inside a string, for the patterns whose mark it holds. */
  function markup(text: string): void {
    let i = 0;
    for (; i < markupsLength; i++) {
      text.indexOf(markups[i]) > -1 && readAttrs(
        text, markupRegExps[i], out, push,
      );
    }
  }

  return <O extends unknown[]>(file: ts.SourceFile, list: O, write: TStringPush<O>): void => {
    const outerOut = out;
    const outerPush = push;
    out = list;
    push = write as TStringPush<unknown[]>;
    try {
      visit(file);
    } finally {
      out = outerOut;
      push = outerPush;
    }
  };
}

/**
 * The values of the attributes and object keys of these names, as ranges of the text — for a writer that edits them
 * (minotation's scope class). A JSX attribute gives its string or the expression inside its braces; an object key —
 * its value. A value isn't searched for more: an attribute of a class holds no other. An attribute with no value
 * (`<b className />`) gives nothing.
 *
 * @param typescript - TypeScript's module
 * @param file - the tree, from {@link parseSource}
 * @param names - names and `*Ending` patterns
 * @returns the ranges `[from, to)`, in the order of the text
 *
 * @example
 * import ts from 'typescript';
 * const source = '<b className={on && "p"} />';
 * syntaxValueRanges(ts, parseSource(ts, source)!, ['className']);   // => [[14, 23]] — `on && "p"`
 */
export function syntaxValueRanges(
  typescript: TTypeScript, file: ts.SourceFile, names: readonly string[],
): TSourceRange[] {
  if (process.env.NODE_ENV !== 'production') {
    checkTypeScript(typescript, 'syntaxValueRanges');
  }
  const kinds = typescript.SyntaxKind;
  const ranges: TSourceRange[] = [];
  const nameOf = (node: ts.Node): string => (node.kind === kinds.Identifier || node.kind === kinds.StringLiteral
    ? (node as ts.Identifier | ts.StringLiteral).text : '');
  const visit = (node: ts.Node): void => {
    let value: ts.Node | undefined;
    if (node.kind === kinds.JsxAttribute && matchesName(nameOf((node as ts.JsxAttribute).name), names)) {
      value = (node as ts.JsxAttribute).initializer;
      value && value.kind === kinds.JsxExpression && (value = (value as ts.JsxExpression).expression);
    } else if (node.kind === kinds.PropertyAssignment
      && matchesName(nameOf((node as ts.PropertyAssignment).name), names)) {
      value = (node as ts.PropertyAssignment).initializer;
    }
    if (value) {
      ranges.push([
        value.getStart(file),
        value.end,
      ]);
      return;
    }
    typescript.forEachChild(node, visit);
  };
  visit(file);
  return ranges;
}
