import { attachEvent } from "../../../attachEvent";

/**
 * Returns an `onMessage` subscription factory for any `EventTarget` that emits `MessageEvent`s.
 *
 * @param ctx - The event target (e.g., `Worker`, `MessagePort`, `globalThis`).
 * @returns A function that registers a message listener and returns an unsubscribe callback.
 * @example
 * const onMessage = onRpcMessageProvider(worker);
 * const unsub = onMessage((data) => console.log(data));
 */
export function onRpcMessageProvider(ctx: EventTarget) {
  return (listener: (data: any) => any) => attachEvent(ctx, 'message', (e) => {
    listener(e.data);
  });
}
