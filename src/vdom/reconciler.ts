// The reconciler of fundamentool's view library (fundamentool D-072): a tree of fibers kept between renders, brought
// to each new element tree in place — the DOM changed as it goes (as Preact does), effects and refs run after.
//
// A fiber is a mounted node: an element of the DOM (HOST), a text (TEXT), a component (COMPONENT — a function,
// `forwardRef`, `memo`, a context's consumer), a fragment or a context's provider (GROUP), a portal (PORTAL), the
// root (ROOT). HOST and TEXT own a DOM node; ROOT and PORTAL own a container; COMPONENT and GROUP own nothing — their
// DOM is their children's, placed by the nearest fiber that owns a node.
//
// Updates: a state change marks its fiber dirty and queues it; the queue is rendered in a microtask, the shallowest
// fibers first (a parent's render renders its dirty children on the way). Then the commit: layout effects and refs,
// children before parents. Passive effects (`useEffect`) run in a later task — or before the next render, whichever
// comes first.
import {
  createTimeout,
} from '../createTimeout';
import {
  isArray,
} from '../is/isArray';
import {
  isPromise,
} from '../is/isPromise';
import {
  diffProps,
  SVG,
} from './dom';
import {
  CONSUMER,
  CONTEXT,
  element,
  ELEMENT,
  FORWARD_REF,
  Fragment,
  keyOf,
  MEMO,
  PORTAL,
  StrictMode,
} from './element';
import type {
  TContext,
  TNode,
} from './element';

/** The kinds of fibers. */
export const HOST = 1;
export const TEXT = 2;
export const COMPONENT = 3;
export const GROUP = 4;
export const PORTAL_FIBER = 5;
export const ROOT = 6;

/** The kinds of effects: `useInsertionEffect`, `useLayoutEffect`, `useEffect`. */
export const INSERTION = 1;
export const LAYOUT = 2;
export const PASSIVE = 3;

/** A mounted node of the tree. */
export type TFiber = {
  /** `HOST`, `TEXT`, `COMPONENT`, `GROUP`, `PORTAL_FIBER`, `ROOT`. */
  kind: number;
  /** The element's type; `undefined` for text, portals and the root. */
  type: any;
  /** The element last rendered (text: the string). */
  el: any;
  /** The key it's matched by among its siblings. */
  key: string;
  /** HOST, TEXT: its node; ROOT, PORTAL: the container. */
  dom: any;
  /** HOST, ROOT, PORTAL: the namespace of its node (`SVG`), `null` for HTML. */
  ns: string | null;
  parent: TFiber | null;
  kids: TFiber[];
  /** Its place among its parent's kids. */
  index: number;
  /** How deep in the tree — the queue renders the shallowest first. */
  depth: number;
  /** COMPONENT: its hooks, in call order. */
  hooks: THook[];
  /** A context's provider: the components that read it. */
  subs: Set<TFiber> | null;
  /** HOST: the ref attached to its node, and what detaches it. */
  ref: any;
  refCleanup: (() => void) | null;
  /** COMPONENT: queued to render again. */
  dirty: boolean;
  /** Unmounted. */
  dead: boolean;
};

/** A hook's record: the fields of its kind. */
export type THook = {
  /** The component it belongs to. */
  fiber: TFiber;
  [field: string]: any;
};

/** Shared by fibers that never have kids or hooks — never written to. */
const NONE: any[] = [];
const NO_PROPS = {};

/** The fiber rendering now, `null` outside a render. */
let current: TFiber | null = null;
/** The index of the next hook of `current`. */
let hookIndex = 0;

/** Fibers to render again. */
const queue: TFiber[] = [];
let flushQueued = false;
/** Layout effects and ref changes of the render, children first. */
let commitQueue: Array<THook | (() => void)> = [];
/** Passive effects waiting for their task. */
let passiveQueue: THook[] = [];
let cancelPassive: (() => void) | null = null;

function fiber(
  kind: number, type: any, key: string, parent: TFiber | null, index: number,
): TFiber {
  return {
    kind,
    type,
    el: undefined,
    key,
    dom: null,
    ns: null,
    parent,
    kids: NONE,
    index,
    depth: parent ? parent.depth + 1 : 0,
    hooks: kind === COMPONENT ? [] : NONE,
    subs: null,
    ref: null,
    refCleanup: null,
    dirty: false,
    dead: false,
  };
}

/** A COMPONENT or a GROUP: no node of its own, its kids' nodes are placed in its parent's. */
function isTransparent(f: TFiber): boolean {
  const kind = f.kind;
  return kind === COMPONENT || kind === GROUP;
}

/** The namespace of a container's children. */
function nsOf(node: any): string | null {
  return node.namespaceURI === SVG && node.localName !== 'foreignObject' ? SVG : null;
}

/** The next hook of the component rendering now. */
export function nextHook(): THook {
  const f = current;
  if (!f) {
    throw new Error('Hooks are called only while a component renders.');
  }
  const hooks = f.hooks;
  let hook = hooks[hookIndex];
  if (!hook) {
    hooks[hookIndex] = hook = {
      fiber: f,
    };
  }
  hookIndex++;
  return hook;
}

/**
 * Queues a component to render again (its state changed). During its own render, the render starts over at once.
 *
 * @param f - The component's fiber.
 */
export function schedule(f: TFiber): void {
  if (f.dead) {
    return;
  }
  if (f === current) {
    f.dirty = true;
    return;
  }
  if (!f.dirty) {
    f.dirty = true;
    queue.push(f);
  }
  if (!flushQueued) {
    flushQueued = true;
    Promise.resolve().then(flushQueue);
  }
}

function flushQueue(): void {
  flushQueued = false;
  if (queue.length) {
    run(drain);
  }
}

/** Runs an effect: its last cleanup, then itself. */
function fire(hook: THook): void {
  hook.queued = false;
  hook.run = false;
  if (hook.fiber.dead) {
    return;
  }
  const cleanup = hook.cleanup;
  if (cleanup) {
    hook.cleanup = undefined;
    cleanup();
  }
  const result = hook.create();
  hook.cleanup = typeof result === 'function' ? result : undefined;
}

/** Runs the passive effects waiting: every cleanup first, then every effect (as React does). */
export function flushPassive(): void {
  if (cancelPassive) {
    cancelPassive();
    cancelPassive = null;
  }
  const list = passiveQueue;
  const length = list.length;
  if (!length) {
    return;
  }
  passiveQueue = [];
  let i = 0;
  let hook: THook;
  let cleanup: (() => void) | undefined;
  for (; i < length; i++) {
    hook = list[i];
    cleanup = hook.cleanup;
    if (cleanup) {
      hook.cleanup = undefined;
      cleanup();
    }
  }
  for (i = 0; i < length; i++) {
    fire(list[i]);
  }
}

/** Layout effects and ref changes, in the order they were queued; then the passive effects get their task. */
function commit(): void {
  const list = commitQueue;
  commitQueue = [];
  const length = list.length;
  let i = 0;
  let item: THook | (() => void);
  for (; i < length; i++) {
    item = list[i];
    if (typeof item === 'function') {
      item();
    } else {
      fire(item);
    }
  }
  if (passiveQueue.length && !cancelPassive) {
    cancelPassive = createTimeout(flushPassive);
  }
}

function byDepth(a: TFiber, b: TFiber): number {
  return a.depth - b.depth;
}

/** Renders the queued components, the shallowest first, until none is left. */
function drain(): void {
  let f: TFiber;
  while (queue.length) {
    queue.sort(byDepth);
    f = queue.shift() as TFiber;
    if (f.dirty && !f.dead) {
      rerender(f);
    }
  }
}

/**
 * One update: the passive effects left from before, the work, the queue it caused, the commit — and again while the
 * layout effects set state (rendered before the browser paints, as React does).
 */
function run(work: () => void): void {
  flushPassive();
  work();
  let passes = 0;
  do {
    if (++passes > 50) {
      queue.length = 0;
      throw new Error('Maximum update depth exceeded: a layout effect sets state on every commit.');
    }
    drain();
    commit();
  } while (queue.length);
}

/** Queues a component's effects that need to run — after its children's (insertion effects run at once). */
function queueEffects(f: TFiber): void {
  const hooks = f.hooks;
  const length = hooks.length;
  let i = 0;
  let hook: THook;
  let tag: number;
  for (; i < length; i++) {
    hook = hooks[i];
    if (hook.run && !hook.queued) {
      tag = hook.tag;
      if (tag === INSERTION) {
        fire(hook);
      } else {
        hook.queued = true;
        (tag === LAYOUT ? commitQueue : passiveQueue).push(hook);
      }
    }
  }
}

/** Detaches a node's ref: the cleanup its callback returned, or `null` given to it. */
function detachRef(f: TFiber): void {
  const ref = f.ref;
  if (!ref) {
    return;
  }
  const cleanup = f.refCleanup;
  f.ref = null;
  f.refCleanup = null;
  if (cleanup) {
    cleanup();
  } else if (typeof ref === 'function') {
    ref(null);
  } else {
    ref.current = null;
  }
}

/** Queues a node's ref change to the commit: the old one detached, the new one given the node. */
function queueRef(f: TFiber, ref: any): void {
  commitQueue.push(() => {
    if (f.dead) {
      return;
    }
    detachRef(f);
    if (ref) {
      f.ref = ref;
      if (typeof ref === 'function') {
        const cleanup = ref(f.dom);
        f.refCleanup = typeof cleanup === 'function' ? cleanup : null;
      } else {
        ref.current = f.dom;
      }
    }
  });
}

/** Whether two props objects hold the same values (`memo`'s default comparison). */
function shallowEqual(a: any, b: any): boolean {
  let name: string;
  let count = 0;
  for (name in a) {
    if (!(name in b) || !Object.is(a[name], b[name])) {
      return false;
    }
    count++;
  }
  for (name in b) {
    count--;
  }
  return count === 0;
}

/** Adds a child to the lists `diffChildren` matches: nothing for `null` / booleans / functions. */
function addChild(
  child: any, key: string, els: any[], keys: string[],
): void {
  if (child == null || typeof child === 'boolean') {
    return;
  }
  const type = typeof child;
  if (type === 'object') {
    const tag = child.$$typeof;
    if (tag !== ELEMENT && tag !== PORTAL) {
      if (typeof child[Symbol.iterator] === 'function') {
        flatten(
          Array.from(child), key + ':', els, keys,
        );
        return;
      }
      throw new Error('Objects are not valid as a child (found an object with keys {' + Object.keys(child).join(', ')
        + '}); render an array of elements instead.');
    }
  } else if (type === 'function' || type === 'symbol') {
    return;
  }
  els.push(child);
  keys.push(key);
}

/** The children as a flat list of elements / texts / portals with their keys (nested arrays keyed by their path). */
function flatten(
  children: any, prefix: string, els: any[], keys: string[],
): void {
  if (isArray(children)) {
    const length = children.length;
    let i = 0;
    let child: any;
    for (; i < length; i++) {
      child = children[i];
      if (isArray(child)) {
        flatten(
          child, prefix + i + ':', els, keys,
        );
      } else {
        addChild(
          child, prefix + keyOf(child, i), els, keys,
        );
      }
    }
  } else {
    addChild(
      children, prefix + keyOf(children, 0), els, keys,
    );
  }
}

/** Whether a mounted fiber can take a new child: the same type (a text for a text, a portal into the same node). */
function sameType(f: TFiber, child: any): boolean {
  if (typeof child !== 'object') {
    return f.kind === TEXT;
  }
  return child.$$typeof === PORTAL ? f.dom === child.containerInfo : f.type === child.type;
}

/** A new fiber for a child — its DOM node made, nothing rendered yet (`update` does that). */
function create(
  child: any, key: string, parent: TFiber, index: number, host: TFiber,
): TFiber {
  const doc = host.dom.ownerDocument;
  let f: TFiber;
  if (typeof child !== 'object') {
    f = fiber(
      TEXT, undefined, key, parent, index,
    );
    f.el = '' + child;
    f.dom = doc.createTextNode(f.el);
    return f;
  }
  if (child.$$typeof === PORTAL) {
    f = fiber(
      PORTAL_FIBER, undefined, key, parent, index,
    );
    f.dom = child.containerInfo;
    f.ns = nsOf(f.dom);
    return f;
  }
  const type = child.type;
  if (typeof type === 'string') {
    f = fiber(
      HOST, type, key, parent, index,
    );
    const ns = type === 'svg' ? SVG : host.type === 'foreignObject' ? null : host.ns;
    f.ns = ns;
    f.dom = ns ? doc.createElementNS(ns, type) : doc.createElement(type);
    return f;
  }
  if (typeof type === 'function') {
    return fiber(
      COMPONENT, type, key, parent, index,
    );
  }
  if (type === Fragment || type === StrictMode) {
    return fiber(
      GROUP, type, key, parent, index,
    );
  }
  const tag = type != null && type.$$typeof;
  if (tag === CONTEXT) {
    f = fiber(
      GROUP, type, key, parent, index,
    );
    f.subs = new Set();
    return f;
  }
  if (tag === FORWARD_REF || tag === MEMO || tag === CONSUMER) {
    return fiber(
      COMPONENT, type, key, parent, index,
    );
  }
  throw new TypeError('Element type is invalid: expected a tag name, a component, Fragment, a context, memo or '
    + 'forwardRef, got ' + (type === null ? 'null' : typeof type === 'symbol' ? String(type) : typeof type) + '.');
}

/**
 * Brings a fiber's kids to new children: matched by key and type, the others unmounted, the new ones created.
 *
 * @returns Whether its DOM nodes need placing — a kid was created or moved, or a transparent kid's own did.
 */
function diffChildren(
  parent: TFiber, children: TNode, host: TFiber,
): boolean {
  const els: any[] = [];
  const keys: string[] = [];
  flatten(
    children, '', els, keys,
  );
  const old = parent.kids;
  const oldLength = old.length;
  const length = els.length;
  const next: TFiber[] = new Array(length);
  let byKey: Map<string, TFiber> | null = null;
  let changed = false;
  let last = -1;
  let i = 0;
  let j: number;
  let f: TFiber | undefined;
  let child: any;
  let key: string;
  // matching: by index while the keys line up, by key after the first that doesn't
  for (; i < length; i++) {
    child = els[i];
    key = keys[i];
    f = undefined;
    if (!byKey) {
      if (i < oldLength && old[i].key === key && sameType(old[i], child)) {
        f = old[i];
      } else if (oldLength) {
        byKey = new Map();
        for (j = i; j < oldLength; j++) {
          byKey.set(old[j].key, old[j]);
        }
      }
    }
    if (byKey) {
      f = byKey.get(key);
      if (f && sameType(f, child)) {
        byKey.delete(key);
      } else {
        f = undefined;
      }
    }
    if (f) {
      next[i] = f;
      if (f.index < last) {
        changed = true;
      } else {
        last = f.index;
      }
    }
  }
  if (byKey) {
    byKey.forEach((gone) => unmount(gone, true));
  } else {
    for (i = length; i < oldLength; i++) {
      unmount(old[i], true);
    }
  }
  for (i = 0; i < length; i++) {
    f = next[i];
    if (!f) {
      f = next[i] = create(
        els[i], keys[i], parent, i, host,
      );
      changed = true;
    }
    f.index = i;
    if (update(
      f, els[i], host,
    )) {
      changed = true;
    }
  }
  parent.kids = next;
  return changed;
}

/** Brings a fiber to a new element. Returns whether its DOM nodes need placing by the fiber that owns the node. */
function update(
  f: TFiber, child: any, host: TFiber,
): boolean {
  switch (f.kind) {
    case TEXT: {
      const text = '' + child;
      if (f.el !== text) {
        f.el = text;
        f.dom.data = text;
      }
      return false;
    }
    case HOST:
      if (f.el !== child) {
        updateHost(f, child);
      }
      return false;
    case COMPONENT: {
      if (!f.dirty) {
        const old = f.el;
        if (old === child) {
          return false;
        }
        const type = f.type;
        if (old && type.$$typeof === MEMO && (type.compare || shallowEqual)(old.props, child.props)) {
          f.el = child;
          return false;
        }
      }
      return renderComponent(
        f, child, host,
      );
    }
    case GROUP: {
      const old = f.el;
      if (old === child) {
        return false;
      }
      f.el = child;
      const props = child.props;
      const subs = f.subs;
      if (subs && old && !Object.is(old.props.value, props.value)) {
        subs.forEach(schedule);
      }
      return diffChildren(
        f, props.children, host,
      );
    }
    default:
      // a portal: its nodes go into its own container
      if (f.el !== child) {
        f.el = child;
        if (diffChildren(
          f, child.children, f,
        )) {
          place(
            f, f.dom, null,
          );
        }
      }
      return false;
  }
}

/** Brings a DOM element to new props: its attributes, its children, then `value` / `checked`, the ref. */
function updateHost(f: TFiber, child: any): void {
  const prev = f.el;
  const props = child.props;
  const old = prev ? prev.props : NO_PROPS as any;
  const dom = f.dom;
  f.el = child;
  diffProps(
    dom, props, old, f.ns,
  );
  const html = props.dangerouslySetInnerHTML;
  const oldHtml = old.dangerouslySetInnerHTML;
  if (html) {
    unmountAll(f.kids, false);
    f.kids = NONE;
    if (!oldHtml || html.__html !== oldHtml.__html) {
      dom.innerHTML = html.__html;
    }
  } else {
    if (oldHtml) {
      dom.textContent = '';
    }
    if (diffChildren(
      f, props.children, f,
    )) {
      place(
        f, dom, null,
      );
    }
  }
  if (!prev) {
    if (props.value === undefined && props.defaultValue !== undefined) {
      dom.value = props.defaultValue;
    }
    if (props.checked === undefined && props.defaultChecked !== undefined) {
      dom.checked = !!props.defaultChecked;
    }
    if (props.autoFocus) {
      commitQueue.push(() => f.dead || dom.focus());
    }
  }
  // after the children: a <select>'s options are there to be chosen
  const value = props.value;
  if (value !== undefined) {
    const text = value == null ? '' : '' + value;
    if (dom.value !== text) {
      dom.value = text;
    }
  }
  const checked = props.checked;
  if (checked !== undefined && dom.checked !== !!checked) {
    dom.checked = !!checked;
  }
  const ref = props.ref;
  if (ref !== old.ref) {
    queueRef(f, ref);
  }
}

/** What a `forwardRef` / `memo` / consumer component renders. */
function renderObject(type: any, props: any): TNode {
  const tag = type.$$typeof;
  if (tag === FORWARD_REF) {
    if (props.ref === undefined) {
      return type.render(props, null);
    }
    const rest: any = {};
    let name: string;
    for (name in props) {
      if (name !== 'ref') {
        rest[name] = props[name];
      }
    }
    return type.render(rest, props.ref);
  }
  if (tag === MEMO) {
    return element(
      type.type, null, props,
    );
  }
  return props.children(useContext(type._context));
}

/** Renders a component (again while it sets its own state as it renders), then its children; queues its effects. */
function renderComponent(
  f: TFiber, child: any, host: TFiber,
): boolean {
  f.el = child;
  const props = child.props;
  const type = f.type;
  const previous = current;
  const previousIndex = hookIndex;
  let out: TNode;
  let passes = 0;
  current = f;
  try {
    do {
      if (++passes > 25) {
        throw new Error('Too many re-renders: a component sets its state on every render.');
      }
      f.dirty = false;
      hookIndex = 0;
      out = typeof type === 'function' ? type(props) : renderObject(type, props);
    } while (f.dirty);
  } finally {
    current = previous;
    hookIndex = previousIndex;
  }
  const changed = diffChildren(
    f, out, host,
  );
  queueEffects(f);
  return changed;
}

/** Renders a queued component again and places its nodes. */
function rerender(f: TFiber): void {
  let host = f.parent as TFiber;
  while (isTransparent(host)) {
    host = host.parent as TFiber;
  }
  if (renderComponent(
    f, f.el, host,
  )) {
    place(
      f, host.dom, nextDomAfter(f),
    );
  }
}

/** The first DOM node of a fiber's (its own or its first kid's that has one) — a portal's don't count. */
function firstDom(f: TFiber): any {
  const kind = f.kind;
  if (kind === HOST || kind === TEXT) {
    return f.dom;
  }
  if (kind === PORTAL_FIBER) {
    return null;
  }
  const kids = f.kids;
  const length = kids.length;
  let i = 0;
  let dom: any;
  for (; i < length; i++) {
    dom = firstDom(kids[i]);
    if (dom) {
      return dom;
    }
  }
  return null;
}

/** The DOM node that follows a fiber's nodes in their parent node — `null` when they're the last. */
function nextDomAfter(f: TFiber): any {
  let parent = f.parent as TFiber;
  let kids: TFiber[];
  let length: number;
  let i: number;
  let dom: any;
  for (;;) {
    kids = parent.kids;
    length = kids.length;
    for (i = f.index + 1; i < length; i++) {
      dom = firstDom(kids[i]);
      if (dom) {
        return dom;
      }
    }
    if (!isTransparent(parent)) {
      return null;
    }
    f = parent;
    parent = f.parent as TFiber;
  }
}

/** A fiber's kids' top-level DOM nodes, in order — through components and fragments, not into portals. */
function collect(f: TFiber, out: any[]): void {
  const kids = f.kids;
  const length = kids.length;
  let i = 0;
  let kid: TFiber;
  let kind: number;
  for (; i < length; i++) {
    kid = kids[i];
    kind = kid.kind;
    if (kind === HOST || kind === TEXT) {
      out.push(kid.dom);
    } else if (kind !== PORTAL_FIBER) {
      collect(kid, out);
    }
  }
}

/**
 * Puts a fiber's kids' nodes in order into `parentDom`, before `before` — moving only those not in place. With no
 * `before`, the last nodes may stay followed by nodes of others (a portal's container).
 */
function place(
  f: TFiber, parentDom: any, before: any,
): void {
  const nodes: any[] = [];
  collect(f, nodes);
  let i = nodes.length - 1;
  let node: any;
  for (; i >= 0; i--) {
    node = nodes[i];
    if (node.parentNode !== parentDom || before && node.nextSibling !== before) {
      parentDom.insertBefore(node, before);
    }
    before = node;
  }
}

/** Unmounts a fiber and its kids: effects cleaned up, refs detached, contexts left; its nodes removed if `remove`. */
function unmount(f: TFiber, remove: boolean): void {
  f.dead = true;
  const kind = f.kind;
  const isHost = kind === HOST;
  const ownsNode = isHost || kind === TEXT;
  if (kind === COMPONENT) {
    const hooks = f.hooks;
    const length = hooks.length;
    let i = 0;
    let hook: THook;
    let cleanup: (() => void) | undefined;
    for (; i < length; i++) {
      hook = hooks[i];
      cleanup = hook.cleanup;
      if (cleanup) {
        hook.cleanup = undefined;
        cleanup();
      }
      if (hook.provider) {
        hook.provider.subs.delete(f);
      }
    }
  } else if (isHost) {
    detachRef(f);
  }
  if (remove && ownsNode) {
    f.dom.remove();
  }
  unmountAll(f.kids, kind === PORTAL_FIBER || remove && !ownsNode);
}

function unmountAll(kids: TFiber[], remove: boolean): void {
  const length = kids.length;
  let i = 0;
  for (; i < length; i++) {
    unmount(kids[i], remove);
  }
}

/**
 * Reads a context: the value of the nearest provider above, or the context's default. The component renders again
 * when that provider's value changes.
 *
 * @param context - What `createContext` returned.
 * @returns The value.
 * @example
 * const theme = useContext(Theme);
 */
export function useContext<T>(context: TContext<T>): T {
  const hook = nextHook();
  if (hook.provider === undefined) {
    const f = hook.fiber;
    let provider = f.parent;
    while (provider && provider.type !== context) {
      provider = provider.parent;
    }
    hook.provider = provider;
    if (provider) {
      (provider.subs as Set<TFiber>).add(f);
    }
  }
  const provider: TFiber | null = hook.provider;
  return provider ? provider.el.props.value : context._currentValue;
}

/** A root: what `createRoot` returns. */
export type TRoot = {
  /** Renders `children` into the container — the first time, what the container held is removed. */
  render(children: TNode): void;
  /** Unmounts everything rendered. */
  unmount(): void;
};

/**
 * A root to render into a DOM container — React's `createRoot` (`react-dom/client`). `render` renders at once (the
 * updates it causes too), then runs the layout effects.
 *
 * @param container - The DOM element to render into.
 * @returns The root.
 * @example
 * createRoot(document.getElementById('root')!).render(<App />);
 */
export function createRoot(container: Element | DocumentFragment): TRoot {
  const root = fiber(
    ROOT, undefined, '', null, 0,
  );
  root.dom = container;
  root.ns = nsOf(container);
  let cleared = false;
  return {
    render(children: TNode): void {
      run(() => {
        if (!cleared) {
          cleared = true;
          container.textContent = '';
        }
        if (diffChildren(
          root, children, root,
        )) {
          place(
            root, container, null,
          );
        }
      });
    },
    unmount(): void {
      run(() => {
        unmountAll(root.kids, true);
        root.kids = NONE;
      });
    },
  };
}

/** Whether a render or a passive effect is waiting. */
function pending(): boolean {
  return queue.length > 0 || passiveQueue.length > 0;
}

/** Renders what is queued and runs the passive effects waiting — again while they queue more. */
function flushAll(): void {
  let passes = 0;
  while (pending()) {
    if (++passes > 50) {
      queue.length = 0;
      throw new Error('Maximum update depth exceeded: an effect sets state on every render.');
    }
    run(drain);
    flushPassive();
  }
}

/** Flushes, waits a task and looks again, while work keeps coming (what the flushed work started may queue more). */
function settle<T>(value: T): Promise<T> {
  if (!pending()) {
    return Promise.resolve(value);
  }
  flushAll();
  return new Promise((resolve) => {
    createTimeout(resolve);
  }).then(() => settle(value));
}

/**
 * Runs `work`, then every update it caused — renders, layout effects, passive effects — before it returns: React's
 * `act`, for tests. When `work` returns a promise, then once it resolves the updates are flushed, a task waited and
 * the updates flushed again, until none comes (as React does): a module loaded by an effect is rendered inside it.
 *
 * @param work - What changes state: a render, an event, a store's update.
 * @returns A promise of what `work` returned; a test that doesn't await it gets the updates done anyway.
 * @example
 * act(() => root.render(<Counter />));
 * act(() => button.click());
 * expect(container.textContent).toBe('1');
 * await act(async () => store.load());
 */
export function act<T>(work: () => T | Promise<T>): Promise<T> {
  const result = work();
  if (isPromise(result)) {
    return result.then(settle);
  }
  flushAll();
  return Promise.resolve(result);
}
