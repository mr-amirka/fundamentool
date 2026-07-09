import type {
  TRpcClientOptionsOnMessage,
  TRpcClientOptionsPostMessage,
} from '../../types';
import {
  RpcClient, 
} from '../../RpcClient';
import {
  SyntheticWorker, 
} from '../SyntheticWorker';
import {
  onRpcMessageProvider, 
} from './onRpcMessageProvider';

/** Worker type for `RpcClientWorker`. Falls back automatically if the chosen type is unavailable. */
export type TRpcClientWorkerOptionsType = 'ordinary' | 'shared' | 'synthetic';

/** Options for `RpcClientWorker`. */
export type TRpcClientWorkerOptions = {
  /**
   * Which worker API to use.
   * - `'ordinary'` — standard `Worker` (default)
   * - `'shared'` — `SharedWorker` (falls back to `Worker` → `SyntheticWorker`)
   * - `'synthetic'` — in-thread `SyntheticWorker` (no serialization overhead)
   */
  type?: TRpcClientWorkerOptionsType,
  /** Options forwarded to the underlying `Worker` / `SharedWorker` constructor. */
  workerOptions?: WorkerOptions,
};

/**
 * `RpcClient` backed by a browser Web Worker (ordinary, shared, or synthetic).
 * Automatically falls back from `SharedWorker` → `Worker` → `SyntheticWorker`
 * based on availability.
 *
 * @example
 * const client = new RpcClientWorker('/worker.js');
 * const result = await client.call('compute', [data]);
 */
export class RpcClientWorker extends RpcClient {
  constructor(url: URL | string, options?: TRpcClientWorkerOptions) {
    const workerType = options?.type || 'ordinary';
    const workerOptions = {
      type: 'module',
      ...options?.workerOptions,
    };

    if (workerType === 'shared') {
      try {
        const worker = new SharedWorker(new URL(url), workerOptions as WorkerOptions);
        const {
          port,
        } = worker;

        super({
          postMessage: port.postMessage.bind(port) as TRpcClientOptionsPostMessage,
          onMessage: onRpcMessageProvider(port) as TRpcClientOptionsOnMessage,
        });

        port.start();
        return;
      } catch(e) {
        console.warn('RpcClientWorker: SharedWorker is unavailable');
      }
    }

    if (workerType !== 'synthetic') {
      try {
        const worker = new Worker(new URL(url), workerOptions as WorkerOptions);
        super({
          postMessage: worker.postMessage.bind(worker) as TRpcClientOptionsPostMessage,
          onMessage: onRpcMessageProvider(worker) as TRpcClientOptionsOnMessage,
        });
        return;
      } catch(e) {
        console.warn('RpcClientWorker: Worker is unavailable. SyntheticWorker is used');
      }
    }

    /*
      Если не один воркер не доступен, создаем синтетический.
      Такое бывает при создании вложенных воркеров, в частности SharedWorker
    */
    const worker = new SyntheticWorker(url);
    super({
      postMessage: worker.postMessage.bind(worker) as TRpcClientOptionsPostMessage,
      onMessage: onRpcMessageProvider(worker),

      // Внутри одного потока сериализация не нужна
      serializable: false,
    });
  }
}
