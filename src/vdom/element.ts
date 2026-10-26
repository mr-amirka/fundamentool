// Elements and the element-level API of fundamentool's view library (fundamentool D-072): the shapes React 19 gives
// them — the same `$$typeof` symbols, `ref` among the props — so libraries written for React (MUI, emotion, react-is)
// read them as React's own.
import {
  isArray,
} from '../is/isArray';

/** An element's `$$typeof` (React 19's). */
export const ELEMENT = Symbol.for('react.transitional.element');
/** A portal's `$$typeof`. */
export const PORTAL = Symbol.for('react.portal');
/** `forwardRef`'s `$$typeof`. */
export const FORWARD_REF = Symbol.for('react.forward_ref');
/** `memo`'s `$$typeof`. */
export const MEMO = Symbol.for('react.memo');
/** A context's `$$typeof` — the context is its own provider (React 19). */
export const CONTEXT = Symbol.for('react.context');
/** A context consumer's `$$typeof`. */
export const CONSUMER = Symbol.for('react.consumer');

/** `<Fragment>` — its children, nothing of its own. */
export const Fragment = Symbol.for('react.fragment');
/** `<StrictMode>` — renders its children as `Fragment` does (the development checks are React's own). */
export const StrictMode = Symbol.for('react.strict_mode');

/** The React version libraries compare against: `parseInt(version) >= 19` reads `ref` from the props. */
export const version = '19.2.0-fundamentool';

/** What a component, a host element or a context may be. */
export type TElementType = string | symbol | ((props: any) => TNode) | { $$typeof: symbol };

/** An element: what `createElement` / `jsx` return and the tree is described with. */
export type TElement<P = any> = {
  $$typeof: symbol;
  type: any;
  key: string | null;
  props: P;
};

/** A portal: children rendered into another DOM container. */
export type TPortal = {
  $$typeof: symbol;
  key: string | null;
  children: TNode;
  containerInfo: Element | DocumentFragment;
};

/** What can be rendered: elements, text, portals, nothing, and arrays of them. */
export type TNode = TElement | TPortal | string | number | bigint | boolean | null | undefined | Iterable<TNode>;

/** A ref: an object whose `current` is set, or a function called with the value (its returned function cleans up). */
export type TRef<T = any> = { current: T } | ((value: T | null) => void | (() => void)) | null | undefined;

/** A context made by `createContext`: the provider itself, `Provider` (the same), `Consumer`. */
export type TContext<T> = {
  $$typeof: symbol;
  _currentValue: T;
  Provider: TContext<T>;
  Consumer: {
    $$typeof: symbol;
    _context: TContext<T>;
  };
  displayName?: string;
};

/** The props `createElement` doesn't pass through. */
const KEY = 'key';
const SELF = '__self';
const SOURCE = '__source';

/** Fills the props a type declares defaults for (`type.defaultProps`) and that weren't given. */
function applyDefaults(type: any, props: any): void {
  const defaults = type && type.defaultProps;
  if (defaults) {
    let name: string;
    for (name in defaults) {
      if (props[name] === undefined) {
        props[name] = defaults[name];
      }
    }
  }
}

/** The element itself — every element of the library is made here, so they all have one shape. */
export function element(
  type: any, key: string | null, props: any,
): TElement {
  return {
    $$typeof: ELEMENT,
    type,
    key,
    props,
  };
}

/** Sets `props.children` from a call's arguments after `first` — one child as is, several as an array. */
function childrenFrom(
  args: IArguments, first: number, props: any,
): void {
  const length = args.length;
  if (length === first + 1) {
    props.children = args[first];
  } else if (length > first + 1) {
    const children = new Array(length - first);
    let i = first;
    for (; i < length; i++) {
      children[i - first] = args[i];
    }
    props.children = children;
  }
}

/**
 * Makes an element — React's `createElement`: `key` leaves the props, `ref` stays among them (React 19), children
 * from the third argument on.
 *
 * @param type - A tag name, a component, `Fragment`, a context, a `memo` / `forwardRef` object.
 * @param config - The props, `key` included.
 * @param children - The children (one or several).
 * @returns The element.
 * @example
 * createElement('button', { className: 'primary', onClick: save }, 'Save');
 * // { $$typeof: ELEMENT, type: 'button', key: null, props: { className: 'primary', onClick: save, children: 'Save' } }
 */
export function createElement(type: TElementType, config?: any, ...children: any[]): TElement;
export function createElement(type: any, config?: any): TElement {
  const props: any = {};
  let key: string | null = null;
  if (config != null) {
    let name: string;
    for (name in config) {
      if (name === KEY) {
        if (config.key !== undefined) {
          key = '' + config.key;
        }
      } else if (name !== SELF && name !== SOURCE) {
        props[name] = config[name];
      }
    }
  }
  childrenFrom(
    arguments, 2, props,
  );
  applyDefaults(type, props);
  return element(
    type, key, props,
  );
}

/**
 * The automatic JSX runtime's element (`react/jsx-runtime`): the props object comes ready, children included; the
 * key comes apart (or within the props, from a spread).
 *
 * @param type - What `createElement` takes.
 * @param config - The props, children included.
 * @param maybeKey - The key written in JSX (`<li key={id}>`).
 * @returns The element.
 * @example
 * jsx('li', { children: 'Milk' }, 'milk'); // { type: 'li', key: 'milk', props: { children: 'Milk' } }
 */
export function jsx(
  type: TElementType, config: any, maybeKey?: string | number,
): TElement {
  let key = maybeKey === undefined ? null : '' + maybeKey;
  let props = config;
  if (KEY in config) {
    if (config.key !== undefined) {
      key = '' + config.key;
    }
    props = {};
    let name: string;
    for (name in config) {
      if (name !== KEY) {
        props[name] = config[name];
      }
    }
  }
  applyDefaults(type, props);
  return element(
    type, key, props,
  );
}

/** `jsx` for several static children — the same element. */
export const jsxs = jsx;
/** The development runtime's `jsxDEV` — the same element (the source location isn't kept). */
export const jsxDEV = jsx;

/**
 * Whether a value is an element (portals aren't, as in React).
 *
 * @param value - Anything.
 * @returns `true` for what `createElement` / `jsx` / `cloneElement` returned.
 * @example
 * isValidElement(<b />); // true
 * isValidElement('text'); // false
 */
export function isValidElement(value: any): value is TElement {
  return typeof value === 'object' && value !== null && value.$$typeof === ELEMENT;
}

/**
 * Copies an element with props changed — React's `cloneElement`: `config` overrides props (its `key` the key, its
 * `ref` the ref), children from the third argument replace the old ones.
 *
 * @param source - The element to copy.
 * @param config - Props to set.
 * @param children - New children.
 * @returns The new element.
 * @example
 * cloneElement(<Item label="a" />, { selected: true }); // <Item label="a" selected />
 */
export function cloneElement(source: TElement, config?: any, ...children: any[]): TElement;
export function cloneElement(source: TElement, config?: any): TElement {
  const props: any = {};
  const old = source.props;
  let key = source.key;
  let name: string;
  for (name in old) {
    props[name] = old[name];
  }
  if (config != null) {
    if (config.key !== undefined) {
      key = '' + config.key;
    }
    for (name in config) {
      if (name !== KEY && name !== SELF && name !== SOURCE && !(name === 'ref' && config.ref === undefined)) {
        props[name] = config[name];
      }
    }
  }
  childrenFrom(
    arguments, 2, props,
  );
  return element(
    source.type, key, props,
  );
}

/**
 * A component that receives the ref given to it as a second argument (`ref` is a prop in React 19 — kept for the
 * libraries written that way).
 *
 * @param render - `(props, ref) => node`.
 * @returns The component's type.
 * @example
 * const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
 */
export function forwardRef<P = any, T = any>(render: (props: P, ref: TRef<T>) => TNode): any {
  return {
    $$typeof: FORWARD_REF,
    render,
  };
}

/**
 * A component rendered again only when its props changed (shallowly, or by `compare`) — or its own state / a context
 * it reads.
 *
 * @param type - The component.
 * @param compare - `(oldProps, newProps) => true` when they're equal; the default compares each prop with `Object.is`.
 * @returns The component's type.
 * @example
 * const Row = memo(({ item }) => <li>{item.name}</li>);
 */
export function memo<P = any>(type: TElementType, compare?: (oldProps: P, newProps: P) => boolean): any {
  return {
    $$typeof: MEMO,
    type,
    compare: compare === undefined ? null : compare,
  };
}

/**
 * A context: a value components below its provider read with `useContext`; `defaultValue` where there's no provider.
 * The context is its own provider (`<Theme value={…}>`, React 19), `Provider` is the same, `Consumer` takes a function.
 *
 * @param defaultValue - What `useContext` returns outside every provider.
 * @returns The context.
 * @example
 * const Theme = createContext('light');
 * <Theme value="dark"><Page /></Theme>
 */
export function createContext<T>(defaultValue: T): TContext<T> {
  const context = {
    $$typeof: CONTEXT,
    _currentValue: defaultValue,
  } as TContext<T>;
  context.Provider = context;
  context.Consumer = {
    $$typeof: CONSUMER,
    _context: context,
  };
  return context;
}

/**
 * Children rendered into another DOM container (a dialog into `document.body`) — they stay in the tree they're
 * declared in: its contexts, its updates.
 *
 * @param children - What to render.
 * @param container - The DOM node to render into.
 * @param key - The key among siblings.
 * @returns The portal.
 * @example
 * createPortal(<Dialog />, document.body);
 */
export function createPortal(
  children: TNode, container: Element | DocumentFragment, key?: string | number | null,
): TPortal {
  return {
    $$typeof: PORTAL,
    key: key == null ? null : '' + key,
    children,
    containerInfo: container,
  };
}

/** The key of a child among its siblings: its own key, or its position (`'$a'`, `'2'`). */
export function keyOf(child: any, index: number): string {
  return child !== null && typeof child === 'object' && child.key != null ? '$' + child.key : '' + index;
}

/** Calls `visit(child, path)` for every child, nested arrays flattened; `null` / booleans come as `null`. */
function eachChild(
  children: any, path: string, visit: (child: any, path: string) => void,
): void {
  if (isArray(children)) {
    const length = children.length;
    let i = 0;
    let child: any;
    for (; i < length; i++) {
      child = children[i];
      if (isArray(child)) {
        eachChild(
          child, path + keyOf(child, i) + ':', visit,
        );
      } else {
        visit(child === undefined || typeof child === 'boolean' ? null : child, path + keyOf(child, i));
      }
    }
  } else {
    visit(typeof children === 'boolean' ? null : children, path + keyOf(children, 0));
  }
}

/** The element with another key. */
function withKey(source: TElement, key: string): TElement {
  return element(
    source.type, key, source.props,
  );
}

/** Adds what `fn` returned for a child to `out`: arrays flattened, `null` / booleans skipped, elements keyed by path. */
function addMapped(
  result: any, path: string, child: any, out: any[],
): void {
  if (result == null || typeof result === 'boolean') {
    return;
  }
  if (isArray(result)) {
    eachChild(
      result, path + '/.', (inner, innerPath) => addMapped(
        inner, innerPath, inner, out,
      ),
    );
    return;
  }
  out.push(isValidElement(result)
    ? withKey(result, (result.key != null && (!child || child.key !== result.key) ? result.key + '/' : '') + path)
    : result);
}

/**
 * React's `Children`: walking `props.children` whatever shape it has (one child, an array, nested arrays).
 *
 * @example
 * Children.map(children, (child, i) => cloneElement(child, { index: i }));
 * Children.toArray(children).filter(isValidElement);
 */
export const Children = {
  /** A new array of what `fn` returned for each child; the elements get keys by their place. */
  map<T, R>(
    children: T, fn: (child: any, index: number) => R, context?: any,
  ): R[] {
    if (children == null) {
      return children as any;
    }
    const out: any[] = [];
    let index = 0;
    eachChild(
      children, '.', (child, path) => addMapped(
        fn.call(
          context, child, index++,
        ), path, child, out,
      ),
    );
    return out;
  },
  /** Calls `fn` for each child. */
  forEach(
    children: any, fn: (child: any, index: number) => void, context?: any,
  ): void {
    if (children != null) {
      let index = 0;
      eachChild(
        children, '', (child) => fn.call(
          context, child, index++,
        ),
      );
    }
  },
  /** How many children (nested `null`s count, as in React). */
  count(children: any): number {
    let count = 0;
    if (children != null) {
      eachChild(
        children, '', () => count++,
      );
    }
    return count;
  },
  /** The children as a flat array — `null` / booleans dropped, elements keyed by their place. */
  toArray(children: any): any[] {
    return Children.map(children, (child) => child) || [];
  },
  /** The one element child — or an error. */
  only(children: any): TElement {
    if (!isValidElement(children)) {
      throw new Error('Children.only expected to receive a single element child.');
    }
    return children;
  },
};
