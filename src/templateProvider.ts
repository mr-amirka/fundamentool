import { getBase } from './get';
import { push } from './push';
import { wrapper } from './wrapper';
import { templatePartsJoin } from './templatePartsJoin';

const REGEXP =
  /\{\{((?:(?:"[^"]*")|(?:'[^']*')|(?:`[^`]*`)|(?:\{\{.*?\}\})|(?:[^}]*?))*?)\}\}/g; // eslint-disable-line

function defaultParse(expression: string) {
  const paths = expression.split('.');
  return (scope: any) => getBase(scope, paths);
}

/**
 * Creates a template function from a string with `{{expr}}` placeholders.
 * 
 * @param template - The template to build.
 * @param parse - The function to parse the expressions.
 * @param regexp - The regular expression to use.
 * @returns The template function.
 * @example
 * const render = templateProvider('Hello {{name}}!');
 * render({ name: 'World' }); // => 'Hello World!'
 *
 * const render2 = templateProvider('{{a}} + {{b}} = {{a}}');
 * render2({ a: 1, b: 2 }); // => '1 + 2 = 1'
 */
export function templateProvider(
  template: string,
  parse: ((expression: string) => (scope: any) => any) | null = null,
  regexp: RegExp = REGEXP,
) {
  const parts: Array<(scope: any) => any> = [];
  let start = 0;
  const length = template.length;
  const parser = parse || defaultParse;

  template.replace(regexp, (haystack, exp, offset: number) => {
    offset > start && push(parts, wrapper(template.slice(start, offset)));
    exp && push(parts, parser(exp));
    start = offset + haystack.length;
    return '';
  });

  start < length && push(parts, wrapper(template.slice(start, length)));

  return templatePartsJoin(parts);
}

