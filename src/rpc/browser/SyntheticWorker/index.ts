import {
  PortPolyfill, 
} from '../../../PortPolyfill';
import {
  GLOBAL_CONTEXT, 
} from '../../../globalContext';
import {
  noop, 
} from '../../../noop';

export type TSyntheticWorkerListener = (parent: SyntheticWorker) => void;

/**
 * `MessagePort`-compatible worker that runs its script as a same-realm dynamic
 * `import()` instead of a real `Worker` thread — for environments without
 * worker support (e.g. some WebViews) or when synchronous shared state is needed.
 *
 * Messages sent before the imported script calls `SyntheticWorker.connect()`
 * are queued and flushed once the worker instance calls `start()`.
 *
 * @example
 * const worker = new SyntheticWorker('/worker-entry.js');
 * worker.postMessage({ type: 'ping' }); // queued until the script starts the port
 */
export class SyntheticWorker extends PortPolyfill {
  private static listeners: TSyntheticWorkerListener[] = [];

  /*
    Счётчик хранится в глоблальном контексте,
    а не в статических свойствах класса, так как подгружаемые
    скрипты синтетических воркеров могут ссылаться на собственные классы
  */
  private static lastIndexKey = 'SyntheticWorkerLastIndex';
  private static consistencyPromiseKey = 'SyntheticWorkerConsistencyPromise';

  private deferredMessages: any[] | null = [];

  /*
    Инициализируем синтетичские воркеры последовательно
    чтобы во вложенном воркеке не подписаться на чужой обработчик
  */
  private static onInit(callback: () => void) {
    const consistencyPromise: Promise<void> = GLOBAL_CONTEXT[SyntheticWorker.consistencyPromiseKey]
      || Promise.resolve();
    GLOBAL_CONTEXT[SyntheticWorker.consistencyPromiseKey] = consistencyPromise
      .then(callback)
      .catch(noop);
  }

  /**
   * Returns the next global synthetic-worker index (persisted on `GLOBAL_CONTEXT`
   * so nested synthetic workers, each with their own module scope, share one counter).
   *
   * @returns Promise resolving to the next 1-based index.
   */
  static incrementIndex() {
    const index = Number(GLOBAL_CONTEXT[SyntheticWorker.lastIndexKey] || 0) + 1;
    GLOBAL_CONTEXT[SyntheticWorker.lastIndexKey] = index;
    return Promise.resolve(index);
  }

  /**
   * Called from within the loaded worker script to obtain the `SyntheticWorker`
   * instance that loaded it (the counterpart of `new Worker()`'s implicit `self`).
   *
   * @returns Promise resolving to the parent `SyntheticWorker` instance.
   */
  static async connect() {
    return new Promise<SyntheticWorker>((resolve) => {
      SyntheticWorker.listeners.push(resolve);
    });
  }

  /**
   * @param scriptURL - URL of the worker script, dynamically `import()`-ed in the current realm.
   */
  constructor(scriptURL: string | URL) {
    super();
    /*
      Откладываем инициализацию в конец итерации event loop,
      чтобы в первой инициализирующей итерации родительского воркера
      Нам было гарантированно известно, что сейчас
      исполняется код не из синтетического воркера
    */
    SyntheticWorker.onInit(() => {
      const listeners: TSyntheticWorkerListener[] = SyntheticWorker.listeners = [];
      return import(/* @vite-ignore */ (new URL(scriptURL)).href)
        .then(() => {
          for (const listener of listeners) {
            listener(this);
          }
        });
    });
  }

  /**
   * Sends a message. Queued until `start()` if the worker script hasn't
   * connected its port yet.
   *
   * @param data - Message payload.
   */
  postMessage(data: any) {
    const deferredMessages = this.deferredMessages;
    if (deferredMessages) {
      deferredMessages.push(data);
      return;
    }
    super.postMessage(data);
  }

  /**
   * Flushes messages queued by `postMessage()` before the worker script connected.
   * Called by the worker script once it's ready to receive messages.
   */
  start() {
    const deferredMessages = this.deferredMessages;
    if (!deferredMessages) {
      return;
    }
    this.deferredMessages = null;
    for (const message of deferredMessages) {
      super.postMessage(message);
    }
  }
}
