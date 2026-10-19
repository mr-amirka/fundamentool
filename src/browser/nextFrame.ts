declare function requestAnimationFrame(callback: (time: number) => void): number;
declare function cancelAnimationFrame(handle: number): void;

/**
 * Runs `callback` once, on the next animation frame — e.g. to start a CSS transition after the element was painted in
 * its initial state. The one-shot companion of the {@link createAnimationFrame} loop.
 *
 * @param callback - Called with the frame's timestamp (ms, as `requestAnimationFrame` gives it).
 * @returns A function that cancels the call if the frame hasn't come yet; calling it later does nothing.
 * @example
 * useEffect(() => nextFrame(() => setPlace('in')), []); // slide in after the first paint
 */
export function nextFrame(callback: (time: number) => void): () => void {
  let handle = requestAnimationFrame((time) => {
    handle = 0;
    callback(time);
  });
  return () => {
    if (handle) {
      cancelAnimationFrame(handle);
      handle = 0;
    }
  };
}
