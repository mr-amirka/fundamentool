// Links for any router (fundamentool D-049): `Link` — a real `<a href>` that steps through the router;
// `NavLink` — marked active while its address is shown. A navigator's `nav.Link` / `nav.NavLink` are these.
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
  viewLibraryShape,
} from './library';
import {
  object,
} from '../schema';
import {
  ROUTER,
} from '../router/schemas';
import type {
  TViewLibrary,
} from './library';
import {
  viewHooksProvider,
} from './viewHooksProvider';

const WHERE = '[fundamentool] linksProvider';

/** What `linksProvider` takes: the router and the view library's members it uses (the rest may come along). */
const LINKS_DEPS = object({
  router: ROUTER,
  ...viewLibraryShape([
    'createElement',
    'forwardRef',
    'useSyncExternalStore',
    'useRef',
  ]),
}).passthrough();

/** A link's props: where it goes, and the anchor's own. */
export type TLinkProps = {
  /**
   * Where it goes in the router's part (D-043): a string read as `<a href>` reads it (`/level/2`, `?tab=map`, `42`), or
   * a change of the current location (`{ path, query }` — the values encoded, no `path` — the current one). Left out —
   * the current location. A string with a scheme or a host (`https://…`, `mailto:…`, `//cdn…`) leads outside the part:
   * a plain anchor the browser follows.
   */
  href?: string | Partial<TUrlProps>;
  /**
   * Hears every click. In the router's part `false` (or a promise of it) cancels the step; on a click the browser
   * handles (a new tab, a download, an address outside the part) its result is ignored — `event.preventDefault()` stops
   * the browser.
   */
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

/** What a link's click handler reads of the event: the button and the modifier keys (a new tab or window). */
type TClickEvent = {
  preventDefault?: () => void;
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

/** An `href` with a scheme (`https:`, `mailto:`) or a host (`//cdn.example`) — an address outside the router's part. */
const OUTSIDE_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/** Where a link goes from `location`: its `href` read against it (left out — `location` itself); `null` — outside the part. */
export function targetOf(href: TLinkProps['href'], location: TUrlProps): TUrlProps | null {
  if (href === undefined) {
    return location;
  }
  if (typeof href !== 'string') {
    return locate(href, location);
  }
  return OUTSIDE_HREF.test(href) ? null : resolveHref(href, location);
}

/** A target's address; `null` — outside the part. */
const hrefOf = (target: TUrlProps | null): string | null => (target === null ? null : target.href);

/** `useStoreMap`'s update filter: a link's target changed when it leads to another address. */
const targetChanged = (update: TUrlProps | null, current: TUrlProps | null): boolean => hrefOf(update) !== hrefOf(current);

/** A click the browser handles itself: a modifier key or another button (a new tab or window), a `target`, a download. */
function browserClick(event: TClickEvent, anchor: Record<string, unknown>): boolean {
  return Boolean(event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    || (anchor.target !== undefined && anchor.target !== '_self')
    || anchor.download !== undefined;
}

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
  LINKS_DEPS.parse(deps, WHERE);
  const router = deps.router;
  const {
    createElement: h,
    forwardRef,
  } = deps;
  const {
    useStoreMap,
  } = viewHooksProvider(deps);
  const primitive = router.historyPrimitive;
  const $location = router.$location;

  /** The link's target (`null` — outside the part); re-renders only when it changes (an absolute `href` never does). */
  function useTarget(href: TLinkProps['href']): TUrlProps | null {
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

  /**
   * An anchor in the router's part: its `href` is what the address bar would show; a click steps there — unless the
   * browser handles it (a new tab, a download). Outside the part — a plain anchor.
   */
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
    if (target === null) {
      // Another site, `mailto:` — the browser follows it
      return h(component || 'a', {
        ...anchor,
        ref,
        href,
        onClick,
      });
    }
    return h(component || 'a', {
      ...anchor,
      ref,
      href: primitive.href(target),
      onClick: (event: TClickEvent) => {
        if (browserClick(event, anchor)) {
          onClick?.(event);
          return;
        }
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
    // A resolved target always has a path (`resolveHref`, `locate`); outside the part — never shown
    const shown = useStoreMap({
      store: $location,
      keys: [
        target === null ? null : target.path,
        !!props.activeAsParent,
      ] as const,
      fn: (location, [
        path,
        parent,
      ]) => path !== null && (location.path === path || parent && location.path.startsWith(pathPrefix(path))),
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
