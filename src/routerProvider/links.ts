// `Link` and `NavLink` builders: anchors that push their address, one click at a time.
import {
  childClassOfReact,
} from '../childClassOfReact';
import {
  extend,
} from '../extend';
import {
  isMatch,
} from '../is/isMatch';
import {
  noop,
} from '../noop';
import {
  urlExtend,
} from '../urlExtend';
import {
  wait,
} from '../wait';
import {
  withAsyncLock,
} from '../withAsyncLock';
import type {
  Observable,
} from '../Observable/types';
import type {
  TUrlProps,
} from '../urlParse';
import type {
  TLinkProps,
  TPushLocation,
  TRouterProviderDeps,
} from './types';
import type {
  TClickEvent,
  TElementType,
} from './internalTypes';

/**
 * `Link` components of one router: an anchor that pushes its address on click. One click at a time across the router's
 * links (a double tap doesn't push twice).
 */
export function createLinkProvider({
  createElement,
  forwardRef,
}: Pick<TRouterProviderDeps, 'createElement' | 'forwardRef'>) {
  /** One click at a time across the router's links; released however the click ends. */
  const click = withAsyncLock(async (
    e: TClickEvent, onClick: (event: TClickEvent) => unknown, url: string, options: TUrlProps, pushLocation: TPushLocation,
    timeout: number,
  ) => {
    if (timeout) {
      await wait(timeout);
    }
    // `false` from the link's own handler cancels the step.
    if ((await onClick(e)) !== false && url) {
      await pushLocation(options);
    }
  });
  return function LinkProvider({
    pushLocation,
    hasHash,
  }: {
    pushLocation: TPushLocation;
    hasHash?: boolean | number;
  }): TElementType {
    return forwardRef((props: TLinkProps, ref: any) => {
      const {
        options: _originOptions,
        component,
        timeout,
        activeAsParent,
        active,
        ...addition
      } = props;

      const onClick: any = props.onClick || noop;
      const options = urlExtend(props.href, _originOptions);
      const url = options.href;

      addition.href = url ? (hasHash ? `#${url}` : url) : undefined;
      addition.ref = ref;
      addition.onClick = async (e: TClickEvent) => {
        e.preventDefault && e.preventDefault();
        if (!active) {
          await click(
            e, onClick, url, options, pushLocation, timeout || 0,
          );
        }
        return false;
      };

      return createElement(component || 'a',
        addition);
    });
  };
}

/** `NavLink` components of one router: a `Link` marked `active` while its address is the current one. */
export function createNavLinkProvider({
  Component,
  createElement,
}: Pick<TRouterProviderDeps, 'Component' | 'createElement'>) {
  return function NavLinkProvider(Link: TElementType, $location: Observable<any>): TElementType {
    return childClassOfReact(Component, (self) => {
      let subscription: (() => any) | 0;
      const setState = self.setState.bind(self);
      const initial = $location.getState();
      self.state = initial;
      // Subscribes once mounted (`componentWillMount` is deprecated) and catches up with a change made in between.
      self.componentDidMount = () => {
        subscription || (subscription = $location.watch(setState));
        const now = $location.getState();
        now === initial || setState(now);
      };
      self.componentWillUnmount = () => {
      subscription && (subscription(), subscription = 0); // eslint-disable-line
      };
      self.render = () => {
        const props = extend({}, self.props);
        const forwardedRef = props.forwardedRef;
        const {
          state,
        } = self;
        const path = state.path || '/';
        const matchs = urlExtend(props.href, props.options);
        const targetPath = matchs.path;
        // A page without a query has `query` undefined — it still matches a link without one.
        const hasActive = path === targetPath && isMatch(state.query || {}, matchs.query);

        if (forwardedRef) {
          delete props.forwardedRef;
          props.ref = forwardedRef;
        }

        if (
          hasActive ||
        (props.activeAsParent &&
          path.startsWith(targetPath.slice(-1) === '/' ? targetPath : targetPath + '/'))
        ) {
          props.active = hasActive;
          props.className = 'active ' + (props.className || '');
        }

        return createElement(Link, props);
      };
    }) as any;
  };
}
