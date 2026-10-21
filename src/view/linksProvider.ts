// Links for any router (fundamentool D-049): `Link` — a real `<a href>` that steps through the router;
// `NavLink` — marked active while its address is shown. A navigator's `nav.Link` / `nav.NavLink` are these.
import {
  describeValue,
} from '../describeValue';
import {
  isFunction,
} from '../is/isFunction';
import {
  isObject,
} from '../is/isObject';
import {
  locate,
  pathPrefix,
  resolveHref,
} from '../router/location';
import type {
  TRouter,
} from '../router/types';
import type {
  TUrlProps,
} from '../urlParse';
import {
  withAsyncLock,
} from '../withAsyncLock';
import {
  assertViewLibrary,
} from './library';
import type {
  TViewLibrary,
} from './library';
import {
  viewHooksProvider,
} from './viewHooksProvider';

const WHERE = '[fundamentool] linksProvider';

/** A link's props: where it goes, and the anchor's own. */
export type TLinkProps = {
  /**
   * Where it goes in the router's part (D-043): a string read as `<a href>` reads it (`/level/2`, `?tab=map`, `42`), or
   * a change of the current location (`{ path, query }` — the values encoded, no `path` — the current one). Left out —
   * the current location.
   */
  href?: string | Partial<TUrlProps>;
  /** `false` (or a promise of it) cancels the step. */
  onClick?: (event: { preventDefault?: () => void }) => unknown;
  /** The element to render instead of `a`. */
  component?: unknown;
  /** NavLink: active also on the pages under this one. */
  activeAsParent?: boolean;
  /** NavLink: active whatever the address (a navigator's section shown, a choice of the app's). */
  active?: boolean;
} & Record<string, unknown>;

/** What `linksProvider` takes: the router and the view library's members it uses. */
export type TLinksDeps = Pick<TViewLibrary, 'createElement' | 'forwardRef' | 'useSyncExternalStore' | 'useRef'> & Partial<TViewLibrary> & {
  router: TRouter;
};

/** Where a link goes from `location`: its `href` read against it (left out — `location` itself). */
export function targetOf(href: TLinkProps['href'], location: TUrlProps): TUrlProps {
  if (href === undefined) {
    return location;
  }
  return typeof href === 'string' ? resolveHref(href, location) : locate(href, location);
}

/** `useStoreMap`'s update filter: a link's target changed when it leads to another address. */
const targetChanged = (update: TUrlProps, current: TUrlProps): boolean => update.href !== current.href;

/**
 * `Link` and `NavLink` for a router — with a navigator or without one (a single-screen app keeping its settings in the
 * address). A link is a real `<a href>` (a new tab, copy the link, a middle click); a click steps through the router —
 * one at a time across the links (a double tap steps once).
 *
 * @example
 * const { Link, NavLink } = linksProvider({ router, ...REACT_DEPS });
 * <Link href="?n=Mars">Mars</Link>
 * <NavLink href="/catalog" activeAsParent>Catalog</NavLink>
 */
export function linksProvider(deps: TLinksDeps) {
  if (!isObject(deps)) {
    throw new TypeError(`${WHERE}: expects an options object, got ${describeValue(deps)}`);
  }
  const router = deps.router;
  if (!isObject(router) || !isFunction(router.pushLocation) || !isObject(router.historyPrimitive)) {
    throw new TypeError(`${WHERE}: "router" expects a router (createRouter(…)), got ${describeValue(router)}`);
  }
  assertViewLibrary(
    WHERE, deps, [
      'createElement',
      'forwardRef',
      'useSyncExternalStore',
      'useRef',
    ],
  );
  const {
    createElement: h,
    forwardRef,
  } = deps;
  const {
    useStoreMap,
  } = viewHooksProvider(deps);
  const primitive = router.historyPrimitive;
  const $location = router.$location;

  /** The link's target; re-renders only when it changes (an absolute `href` never does). */
  function useTarget(href: TLinkProps['href']): TUrlProps {
    return useStoreMap({
      store: $location,
      keys: [href] as const,
      fn: (location, [link]) => targetOf(link, location),
      updateFilter: targetChanged,
    });
  }

  /** One click at a time across the links (a double tap doesn't step twice). */
  const click = withAsyncLock(async (
    event: unknown, onClick: TLinkProps['onClick'], target: TUrlProps,
  ) => {
    if (!onClick || (await onClick(event as never)) !== false) {
      await router.pushLocation(target);
    }
  });

  /** An anchor in the router's part: its `href` is what the address bar would show; a click steps there. */
  const Link = forwardRef((props: TLinkProps, ref: unknown) => {
    const {
      href,
      onClick,
      component,
      activeAsParent: _activeAsParent,
      active: _active,
      ...anchor
    } = props;
    const target = useTarget(href);
    return h(component || 'a', {
      ...anchor,
      ref,
      href: primitive.href(target),
      onClick: (event: { preventDefault?: () => void }) => {
        event.preventDefault?.();
        void click(
          event, onClick, target,
        );
      },
    });
  });

  /**
   * A `Link` with `className="active"` while its address is the one shown (`activeAsParent` — or a page under it), or
   * when `active` says so; re-renders only when that flips.
   */
  function NavLink(props: TLinkProps): unknown {
    const target = useTarget(props.href);
    // A resolved target always has a path (`resolveHref`, `locate`)
    const shown = useStoreMap({
      store: $location,
      keys: [
        target.path,
        !!props.activeAsParent,
      ] as const,
      fn: (location, [
        path,
        parent,
      ]) => location.path === path || parent && location.path.startsWith(pathPrefix(path)),
    });
    const active = shown || !!props.active;
    return h(Link, {
      ...props,
      className: active ? ('active ' + (props.className || '')).trim() : props.className,
    });
  }

  return {
    Link,
    NavLink,
  };
}
