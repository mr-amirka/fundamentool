/** Plain unsubscribe function. */
export interface IUnsubscriberUnsubscribeFn {
  (): void;
}

/** Object with an `unsubscribe()` method (RxJS-compatible). */
export interface IUnsubscriberUnsubscribeObject {
  unsubscribe(): void;
}

/** Accepts either a plain function or an object with `.unsubscribe()`. */
export type TUnsubscriberUnsubscribe = IUnsubscriberUnsubscribeFn
  | IUnsubscriberUnsubscribeObject;

/**
 * Collects unsubscribe callbacks and removes them all at once.
 *
 * @example
 * const unsub = new Unsubscriber();
 * unsub.add(store.subscribe(handler));
 * unsub.add(emitter.subscribe(listener));
 * unsub.unsubscribe(); // removes all at once
 */
export interface IUnsubscriber {
  /** Adds one or more unsubscribers; returns a function that removes them all. */
  add(...unsubscribers: TUnsubscriberUnsubscribe[]): IUnsubscriberUnsubscribeFn;
  /** Calls all registered unsubscribers and clears the list. */
  unsubscribe(): void;
}
