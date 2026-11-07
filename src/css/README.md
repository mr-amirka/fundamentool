# css — CSS values from short text

[Русская версия](./README.ru.md)

`fundamentool/css` (fundamentool D-095) turns short text into CSS values: math with units, variables, colours,
gradients. It also builds a media condition and a child combinator.

## When you need it

- Turn a short notation into CSS values: math with units into `calc()`, a variable into `var(--x, fallback)`, a colour
  with alpha, gradients.
- A media query for a breakpoint, in the classic (`max-width`) or the range syntax.
- A CSS-in-JS or utility-class tool that writes CSS from a spelling of its own (minotation).

The core knows CSS and how to read. **The spelling is the caller's**: the group's characters, the variable's, the
function names and the gradient's pieces. All of it is required; there is no default spelling (lab D-044).
minotation reads its notation with one spelling (`{…}`, `Min{…}`). A style object in TypeScript can use another
(`(…)`, `min(…)`).

```ts
import { cssValuesProvider, mathRules, cssMediaCondition, childCombinator } from 'fundamentool/css';

// once: the spelling (checked in development)
const css = cssValuesProvider({
  group: ['(', ')'], variable: '$', env: '$$', nameEnd: ';',
  functions: { min: 'min', max: 'max', clamp: 'clamp' },
  gradient: { join: '-', stop: 'p', angle: '_g', radial: '_r', repeat: '_rpt', space: '_' },
});
// once per property: the bare number's unit, the units it takes, a minus
const bottom = mathRules({ name: 'bottom', unit: 'px', units: ['px', 'rem', '%'] });

css.math('16+$$safe-area-inset-bottom(0)', bottom); // 'calc(16px + env(safe-area-inset-bottom, 0px))'
css.math('100%-2*$gap', bottom);                    // 'calc(100% - 2 * var(--gap))'
css.math('1/3', bottom);                            // '33.33%'
css.math('min(100%,50rem)', bottom);                // 'min(100%, 50rem)'
css.bare();                                         // 0 — the last value had no operator outside a group
css.variable('$mono(serif)');                       // 'var(--mono, serif)'; not a variable — undefined
css.color('$ink(F00)');                             // ['var(--ink, #f00)']
css.color('F00.5', true);                           // ['#f00', 'rgba(255,0,0,.5)'] — the fallback first
css.gradient('F00-00F_g90');                        // ['linear-gradient(270deg,#f00 0%,#00f 100%)']

cssMediaCondition('width', '<', '480px', 'classic'); // '(max-width: 479.98px)'
cssMediaCondition('width', '<', '480px', 'range');   // '(width < 480px)'
childCombinator(2);                                  // '>*>'
```

The readers don't use `this`, so `const { math, color } = css;` works.

## Math

- **A bare number** gets the property's unit where it is a term (`10` → `10px`). Where it is a factor it stays a
  number: `$gap*2` → `calc(var(--gap) * 2)`, and `10*2` → `calc(10px * 2)`.
- **A number over a number** is a fraction in percent (`1/3` → `33.33%`), but only as the first factor of a product.
  After that `/` divides.
- **One term** has no `calc`; operators get one.
- **A value that is one group** is read as its inside: `(1+2)` → `calc(1px + 2px)`.
- **A unit the property doesn't take** is an error that names the units.
- **A minus before the first term** needs `negative: true`.
- **Zero** is written `0`. Inside math it keeps a unit, because CSS rejects `calc(0 + 5px)`.
- **`bare()`** returns `1` if the last value `math` read had an operator outside every group (`1/2+32`, `$a*2`).
  minotation uses it for its "math without braces" hint.

## The spelling

| Option | What it is | Example |
|---|---|---|
| `group` | a group's characters; a function's arguments and a variable's fallback use them too | `['(', ')']` |
| `variable` | before a variable's name | `'$'`: `$gap` → `var(--gap)` |
| `env` | before an environment variable's name | `'$$'`: `$$x` → `env(x)` |
| `nameEnd` | ends a name where it could go on | `';'`: `$a;-2` → `var(--a)` minus 2 |
| `functions` | math functions as written → their CSS name (`min`, `max`, `clamp`) | `{ Min: 'min' }` |
| `gradient` | `join` between colours, `stop`, `angle`, `radial`, `repeat`, `space` between radial words | `F00p40-00F_g90` |
| `fail` | throws the caller's error; by default a `TypeError` prefixed `[fundamentool/css]` | `(m) => { throw new MyError(m); }` |
| `legacy` | called with the value where a term starts with `--`: the place for an older spelling's hint | minotation's "was renamed" |

Each character of the spelling is one character. It can't be part of a name or of math (letters, digits, `-`, `_`,
`+*/,.%`). Two places can't share a character, except that `env` may begin with `variable`.

## Speed

The readers are a hot path. Math keeps its state in module variables, with no closures and no regular expressions
per call. The spelling is copied into those variables only when another provider's reader ran last, never per
character. minotation's compile benchmark is the gate for changes here.
