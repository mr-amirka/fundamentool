export type TViewportWindowContext = {
  innerWidth?: number;
  innerHeight?: number;
  document: {
    width?: number;
    height?: number;
    documentElement: {
      clientWidth: number;
      clientHeight: number;
    };
  };
};

/**
 * Creates provider of viewport size `[width, height]` for given window.
 *
 * @param w - The window to get the viewport size from.
 * @returns The viewport size provider.
 * @example
 * const getSize = getViewportSizeProvider(window);
 * getSize(); // => [1024, 768]
 */
export function getViewportSizeProvider(w: TViewportWindowContext): (() => [number, number]) {
  const d = w.document;
  const de = d.documentElement;
  return () => {
    return [w.innerWidth || d.width || de.clientWidth, w.innerHeight || d.height || de.clientHeight] as [number, number];
  };
}
