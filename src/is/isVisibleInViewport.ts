/**
 * Checks whether a DOM element is fully visible within the current viewport.
 *
 * @param element - The element to check.
 * @returns `true` if the element's bounding rect is fully inside the viewport.
 * @example
 * isVisibleInViewport(document.getElementById('btn')); // => true or false
 */
export const isVisibleInViewport = (element?: HTMLElement | null): boolean => {
  if (!element) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  const de = document.documentElement;
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || de.clientHeight) &&
    rect.right <= (window.innerWidth || de.clientWidth)
  );
};
