import type {
  IUnsubscriber,
  IUnsubscriberUnsubscribeFn,
  TUnsubscriberUnsubscribe
} from "./types";
import { subscribe } from "../subscribe";

/**
 * Collects unsubscribe callbacks and calls them all at once via `unsubscribe()`.
 *
 * @example
 * const unsub = new Unsubscriber();
 * unsub.add(store.subscribe(listener));
 * unsub.add(emitter.subscribe(handler));
 * unsub.unsubscribe(); // cancels both subscriptions
 */
export class Unsubscriber implements IUnsubscriber {
  private unsubscribers: TUnsubscriberUnsubscribe[];

  constructor(unsubscribers?: TUnsubscriberUnsubscribe[]) {
    this.unsubscribers = unsubscribers ? [...unsubscribers] : [];
  }

  add(...unsubscribers: TUnsubscriberUnsubscribe[]): IUnsubscriberUnsubscribeFn {
    return subscribe(this.unsubscribers, unsubscribers);
  }

  unsubscribe(): void {
    const unsubscribers = this.unsubscribers;
    this.unsubscribers = [];
    for (const unsubscribe of unsubscribers) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        unsubscribe.unsubscribe();
      }
    }
  }
}

export * from "./types";
