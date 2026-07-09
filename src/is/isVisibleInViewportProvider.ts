type TVisibilityContext = {
  window: {
    innerHeight: number;
    innerWidth: number;
    document: {
      documentElement: {
        clientHeight: number;
        clientWidth: number;
      };
    };
  };
};

/**
 * Creates a predicate that checks whether a DOM element is fully visible within the viewport.
 *
 * @param ctx - Viewport context (`window` with `innerHeight`/`innerWidth`/`document`); pass a fake for tests or SSR.
 * @returns Predicate `(element) => boolean`; `false` for a missing element or one partially/fully outside the viewport.
 * @example
 * const isVisible = isVisibleInViewportProvider({ window });
 * isVisible(document.querySelector('.card')); // => true
 * isVisible(null); // => false
 */
export const isVisibleInViewportProvider = (ctx: TVisibilityContext) => {
  const win = ctx.window;
  const de = win.document.documentElement;

  return (element?: HTMLElement | null): boolean => {
    if (!element) {
      return false;
    }
    const rect = element.getBoundingClientRect();

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (win.innerHeight || de.clientHeight) &&
      rect.right <= (win.innerWidth || de.clientWidth)
    );
  };
};
  
