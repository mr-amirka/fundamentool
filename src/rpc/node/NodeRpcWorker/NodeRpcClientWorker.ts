import {
  Worker,
} from 'node:worker_threads';
import {
  RpcClient,
} from '../../RpcClient';
import {
  TRpcClientOptionsPostMessage,
} from '../../types';
import {
  noop, 
} from '../../../noop';

/** Options for `NodeRpcClientWorker`. */
export type TNodeRpcClientWorkerOptions = {
  /** Data passed to the worker via `workerData` (available as `workerData` in `worker_threads`). */
  workerData?: any,
  /** Called when the worker emits an `error` event or exits with a non-zero code. */
  onError?: (error: any) => void,
};

/**
 * `RpcClient` backed by a Node.js `worker_threads` Worker.
 *
 * @example
 * const client = new NodeRpcClientWorker('./worker.js', { workerData: { id: 1 } });
 * const result = await client.call('compute', [data]);
 */
export class NodeRpcClientWorker extends RpcClient {
  constructor(url: string, options?: TNodeRpcClientWorkerOptions) {
    const worker = new Worker(url, {
      workerData: options?.workerData,
    });
    const onError = options?.onError || noop;
    worker.on('error', onError);
    worker.on('exit', (code) => {
      code && onError(new Error(`Worker stopped with exit code ${code}`));
    });

    super({
      postMessage: worker.postMessage.bind(worker) as TRpcClientOptionsPostMessage,
      onMessage: (listener: (data: any) => void) => {
        worker.on('message', listener);
        return () => {
          worker.off('message', listener);
        };
      },
      serializable: true,
    });
  }
}
