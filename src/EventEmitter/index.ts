import type {
  IEventEmitter,
  IEventEmitterListener,
} from './types';

type TListener<T> = (event: T) => void;

/**
 * A small typed event emitter, Node's familiar pattern: a class that owns its event fires it (`emit` is protected),
 * others `subscribe`. Kept as a light utility for any consumer (fundamentool D-111). **Within the lab prefer
 * `createEvent`** (`fundamentool`'s Effector-shaped event): callable, `watch` → `Unsubscribe`, derived events (`map`,
 * `filter`, `prepend`) — it covers every case of this class.
 *
 * The listeners' list is replaced on `subscribe` and on unsubscribing, never changed in place: an `emit` reads the list
 * it starts with and copies nothing; a listener removed during it (every `once`) still hears it, one added hears the
 * next.
 *
 * @example
 * class Saver extends EventEmitter<string> {
 *   save(id: string) { this.emit(id); }
 * }
 * const saver = new Saver();
 * const unsubscribe = saver.subscribe((id) => console.log('saved', id));
 * saver.save('note-7'); // => logs "saved note-7"
 * unsubscribe();
 */
export class EventEmitter<T = any> implements IEventEmitter<T> {
  private listeners: readonly TListener<T>[] | null;

  constructor(listeners?: TListener<T>[]) {
    this.listeners = listeners ? [...listeners] : [];
  }

  destroy() {
    this.listeners = null;
  }

  protected emit(data: T) {
    const listeners = this.listeners;
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
    if (this.listeners) {
      this.listeners = this.listeners.concat(listeners);
    }
    let added: IEventEmitterListener<T>[] | null = listeners;
    return () => {
      if (!added || !this.listeners) {
        added = null;
        return;
      }
      const left = this.listeners.slice();
      for (const listener of added) {
        const index = left.indexOf(listener);
        if (index > -1) {
          left.splice(index, 1);
        }
      }
      this.listeners = left;
      added = null;
    };
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

export * from './types';
