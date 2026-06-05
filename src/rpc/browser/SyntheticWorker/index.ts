import { PortPolyfill } from "../../../PortPolyfill";
import { GLOBAL_CONTEXT } from "../../../globalContext";
import { noop } from "../../../noop";

export type TSyntheticWorkerListener = (parent: SyntheticWorker) => void;

export class SyntheticWorker extends PortPolyfill {
  private static listeners: TSyntheticWorkerListener[] = [];

  /*
    Счётчик хранится в глоблальном контексте,
    а не в статических свойствах класса, так как подгружаемые
    скрипты синтетических воркеров могут ссылаться на собственные классы
  */
  private static lastIndexKey = 'SyntheticWorkerLastIndex';
  private static сonsistencyPromiseKey = 'SyntheticWorkerСonsistencyPromise';

  private deferredMessages: any[] | null = [];

  /*
    Инициализируем синтетичские воркеры последовательно
    чтобы во вложенном воркеке не подписаться на чужой обработчик
  */
  private static onInit(callback: () => void) {
    const сonsistencyPromise: Promise<void>= GLOBAL_CONTEXT[SyntheticWorker.сonsistencyPromiseKey]
      || Promise.resolve();
    GLOBAL_CONTEXT[SyntheticWorker.сonsistencyPromiseKey] = сonsistencyPromise
      .then(callback)
      .catch(noop);
  }

  static incrementIndex() {
    const index = Number(GLOBAL_CONTEXT[SyntheticWorker.lastIndexKey] || 0) + 1;
    GLOBAL_CONTEXT[SyntheticWorker.lastIndexKey] = index;
    return Promise.resolve(index);
  }

  static async connect() {
    return new Promise<SyntheticWorker>((resolve) => {
      SyntheticWorker.listeners.push(resolve);
    });
  }

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

  postMessage(data: any) {
    const deferredMessages = this.deferredMessages;
    if (deferredMessages) {
      deferredMessages.push(data);
      return;
    }
    super.postMessage(data);
  }

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
