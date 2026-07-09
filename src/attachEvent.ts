type TUnsubscribe = () => void;
type TEventListenerOptions = boolean | AddEventListenerOptions | undefined;

/**
 * Attaches an event listener and returns an unsubscribe function.
 *
 * @param ctx - Target to attach event to.
 * @param type - Event type (e.g. `"click"`).
 * @param listener - Event handler.
 * @param options - Native `addEventListener` options.
 * @returns A function that removes the event listener when called.
 * @example
 * const off = attachEvent(window, 'resize', () => console.log('resized'));
 * off(); // removes the listener
 */
export const attachEvent = (
  ctx: EventTarget,
  type: string,
  listener: (event: any) => any,
  options?: TEventListenerOptions,
): TUnsubscribe => {
  ctx.addEventListener(
    type, listener, options,
  );
  return () => {
    ctx.removeEventListener(
      type, listener, options,
    );
  };
};
