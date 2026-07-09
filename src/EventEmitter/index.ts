import { subscribe } from "../subscribe";
import type { IEventEmitter, IEventEmitterListener } from "./types";

type TListener<T> = (event: T) => void;

/**
 * Simple typed event emitter.
 * Supports subscribe/once listeners and a destroy lifecycle hook.
 *
 * @example
 * const emitter = new EventEmitter<number>();
 * const unsubscribe = emitter.subscribe((v) => console.log(v));
 * emitter['emit'](42); // => logs 42
 * unsubscribe();
 */
export class EventEmitter<T = any> implements IEventEmitter<T> {
  private listeners: ((event: T) => void)[] | null;

  constructor(listeners?: TListener<T>[]) {
    this.listeners = listeners ? [...listeners] : [];
  }

  destroy() {
    this.listeners = null;
  }

  protected emit(data: T) {
    const {
      listeners
    } = this;
    if (listeners) {
      let i = 0;
      const len = listeners.length;
      for (; i < len; i++) {
        try {
          listeners[i](data);
        } catch(error) {
          console.error('EventEmitter:listener:error', error);
        }
      }
    }
  }

  subscribe(...listeners: IEventEmitterListener<T>[]) {
    return subscribe(this.listeners, listeners);
  }

  once(...listeners: IEventEmitterListener<T>[]) {
    const unsubscribe = this.subscribe(...listeners, () => {
      unsubscribe();
    });
    return unsubscribe;
  }

  clear() {
    this.listeners = [];
  }
}

export * from "./types";
