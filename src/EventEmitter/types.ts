/** Function returned by `subscribe` — call it to remove the listener. */
export interface IEventEmitterUnsubscribe {
  (): void;
}

/** Listener callback passed to `subscribe`. */
export interface IEventEmitterListener<T = any> {
  (value: T): void;
}

/**
 * Minimal event-emitter interface.
 *
 * @example
 * const emitter: IEventEmitter<string> = new EventEmitter();
 * const off = emitter.subscribe((value) => console.log(value));
 * off(); // removes the listener
 * emitter.destroy();
 */
export interface IEventEmitter<T = any> {
  /** Registers one or more listeners; returns a function that removes them all. */
  subscribe(...listeners: IEventEmitterListener<T>[]): IEventEmitterUnsubscribe;
  /** Destroys the emitter and clears all listeners. */
  destroy(): void;
  /** Removes all listeners without destroying the emitter. */
  clear(): void;
}
