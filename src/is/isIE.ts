const REGEXP_IE = /MSIE|Trident/;

/**
 * Detects Internet Explorer by `window.navigator.userAgent`.
 *
 * @param window - The window object to inspect.
 * @returns `true` if the browser is Internet Explorer.
 * @example
 * isIE(window); // => false (in modern browsers)
 */
export const isIE = (window: any): boolean => {
  const n = window.navigator;
  return !!n && REGEXP_IE.test(n.userAgent);
};

