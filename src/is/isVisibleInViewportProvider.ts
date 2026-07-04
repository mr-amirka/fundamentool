type TVisibilityContext = {
  window: {
    innerHeight: number;
    innerWidth: number;
    document: { documentElement: { clientHeight: number; clientWidth: number } };
  };
};

/**
 * Returns a predicate that checks whether a DOM element is fully visible within the viewport.
 * @param ctx - Viewport context (window with document).
 */
export const isVisibleInViewportProvider = (ctx: TVisibilityContext) => {
  const win = ctx.window;
  const de = win.document.documentElement;

  return (element?: HTMLElement | null): boolean => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (win.innerHeight || de.clientHeight) &&
      rect.right <= (win.innerWidth || de.clientWidth)
    );
  };
};
  
