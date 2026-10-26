// Props onto DOM nodes (fundamentool D-072): attributes and properties, `style`, events — React's spelling of them
// (`className`, `htmlFor`, `onChange` on a text field, `onDoubleClick`, camelCase SVG attributes) turned into the DOM's.
import {
  attachEvent,
} from '../attachEvent';

/** The SVG namespace. */
export const SVG = 'http://www.w3.org/2000/svg';

/** The props that aren't the node's attributes: the tree's own, and those set apart (after the children, on mount). */
export const NOT_ATTRIBUTES = new Set([
  'children',
  'key',
  'ref',
  'value',
  'checked',
  'defaultValue',
  'defaultChecked',
  'dangerouslySetInnerHTML',
  'autoFocus',
  'suppressHydrationWarning',
  'suppressContentEditableWarning',
]);

/** Properties written as attributes even though the node has a property of that name (as Preact does). */
const AS_ATTRIBUTE = new Set([
  'width',
  'height',
  'href',
  'list',
  'form',
  'tabIndex',
  'download',
  'rowSpan',
  'colSpan',
  'role',
  'popover',
]);

/** Numeric style values that take no `px` (`opacity`, `flex`, `zIndex`, `lineHeight`, `fontWeight`, …). */
const UNITLESS = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera|aspect|^scale/i;

/** SVG attributes React spells in camelCase and the DOM in kebab-case (`strokeWidth` → `stroke-width`). */
const SVG_KEBAB = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(?!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
const UPPER = /[A-Z0-9]/g;

/** The `Capture` suffix of an event prop (`onClickCapture`) — `onGotPointerCapture` keeps its own. */
const CAPTURE = /(PointerCapture)$|Capture$/;

/** Where a node keeps its listeners: per prop, `[handler, detach]`. */
const LISTENERS = '__fl';

type TListener = [handler: (event: any) => any, detach: () => void];

/** What React's event objects have beyond the DOM's. */
function noop(): void {
  // `persist()` — events aren't pooled
}
function isDefaultPrevented(this: Event): boolean {
  return this.defaultPrevented;
}
function isPropagationStopped(this: Event): boolean {
  return this.cancelBubble;
}

/** Gives a DOM event what handlers written for React read: `nativeEvent`, `persist()`, `is…()`. */
function asReactEvent(event: any): any {
  event.nativeEvent = event;
  event.persist = noop;
  event.isDefaultPrevented = isDefaultPrevented;
  event.isPropagationStopped = isPropagationStopped;
  return event;
}

/** The DOM event an `on…` prop listens to. */
function eventType(dom: any, name: string): string {
  const type = name.slice(2).toLowerCase();
  if (type === 'change') {
    const tag = dom.localName;
    const kind = dom.type;
    // React's onChange of a text field fires on every keystroke
    return tag === 'textarea' || tag === 'input' && kind !== 'checkbox' && kind !== 'radio' && kind !== 'file'
      ? 'input'
      : type;
  }
  if (type === 'doubleclick') {
    return 'dblclick';
  }
  // React's onFocus / onBlur bubble
  return type === 'focus' ? 'focusin' : type === 'blur' ? 'focusout' : type;
}

/** Sets, swaps or removes the handler of an `on…` prop. */
function setEvent(
  dom: any, name: string, handler: any,
): void {
  const listeners: Record<string, TListener> = dom[LISTENERS] || (dom[LISTENERS] = {});
  const listener = listeners[name];
  if (typeof handler === 'function') {
    if (listener) {
      listener[0] = handler;
      return;
    }
    const stripped = name.replace(CAPTURE, '$1');
    const entry: TListener = [
      handler,
      noop,
    ];
    entry[1] = attachEvent(
      dom,
      eventType(dom, stripped),
      (event) => entry[0](asReactEvent(event)),
      stripped !== name,
    );
    listeners[name] = entry;
  } else if (listener) {
    listener[1]();
    delete listeners[name];
  }
}

/** One style property: custom properties as they are, numbers in `px` unless unitless. */
function setStyleProperty(
  style: any, name: string, value: any,
): void {
  if (name[0] === '-') {
    style.setProperty(name, value == null ? '' : value);
  } else {
    style[name] = value == null ? '' : typeof value !== 'number' || UNITLESS.test(name) ? value : value + 'px';
  }
}

/** `style` — a string or an object of properties, the old ones that are gone cleared. */
function setStyle(
  dom: any, value: any, old: any,
): void {
  const style = dom.style;
  if (typeof value === 'string') {
    style.cssText = value;
    return;
  }
  let name: string;
  if (typeof old === 'string') {
    style.cssText = '';
    old = null;
  }
  if (old) {
    for (name in old) {
      if (!value || !(name in value)) {
        setStyleProperty(
          style, name, '',
        );
      }
    }
  }
  if (value) {
    for (name in value) {
      if (!old || value[name] !== old[name]) {
        setStyleProperty(
          style, name, value[name],
        );
      }
    }
  }
}

/**
 * Sets one prop on a DOM node — `undefined` / `null` removes it.
 *
 * @param dom - The node.
 * @param name - The prop as React spells it.
 * @param value - The new value.
 * @param old - The value it had.
 * @param ns - The node's namespace (`SVG`), `null` for HTML.
 */
export function setProp(
  dom: any, name: string, value: any, old: any, ns: string | null,
): void {
  if (name === 'style') {
    setStyle(
      dom, value, old,
    );
    return;
  }
  if (name[0] === 'o' && name[1] === 'n') {
    setEvent(
      dom, name, value,
    );
    return;
  }
  if (name === 'className') {
    name = 'class';
  } else if (name === 'htmlFor') {
    name = 'for';
  }
  const given = value != null;
  if (ns) {
    name = name === 'tabIndex' ? 'tabindex' : name === 'xlinkHref' ? 'href'
      : SVG_KEBAB.test(name) ? name.replace(UPPER, '-$&').toLowerCase() : name;
  } else if (!AS_ATTRIBUTE.has(name) && name in dom) {
    try {
      dom[name] = given ? value : '';
      if (given) {
        return;
      }
    } catch (_error) {
      // a read-only property — written as an attribute below
    }
  }
  if (typeof value === 'function') {
    return;
  }
  if (given && (value !== false || name[4] === '-')) {
    dom.setAttribute(name, value);
  } else {
    dom.removeAttribute(name);
  }
}

/**
 * Brings a node's attributes, properties, style and listeners from `old` props to `props` — all but what
 * `NOT_ATTRIBUTES` lists.
 *
 * @param dom - The node.
 * @param props - The new props.
 * @param old - The props it was rendered with (`{}` for a new node).
 * @param ns - Its namespace.
 */
export function diffProps(
  dom: any, props: any, old: any, ns: string | null,
): void {
  let name: string;
  for (name in old) {
    if (!(name in props) && !NOT_ATTRIBUTES.has(name)) {
      setProp(
        dom, name, null, old[name], ns,
      );
    }
  }
  let value: any;
  for (name in props) {
    value = props[name];
    if (value !== old[name] && !NOT_ATTRIBUTES.has(name)) {
      setProp(
        dom, name, value, old[name], ns,
      );
    }
  }
}
