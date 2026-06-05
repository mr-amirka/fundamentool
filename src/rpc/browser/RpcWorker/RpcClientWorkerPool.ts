import { RpcClientPool } from "../../RpcClientPool";
import { RpcClientWorker, TRpcClientWorkerOptions } from "./RpcClientWorker";

/** Options for `RpcClientWorkerPool`. */
export type TRpcClientWorkerPoolOptions = Omit<TRpcClientWorkerOptions, 'type'> & {
  /** Maximum number of workers to spawn (default: 1). */
  maxWorkers?: number,
};

/**
 * Pool of `RpcClientWorker` instances that distributes calls to the least-busy worker.
 *
 * @example
 * const pool = new RpcClientWorkerPool('/worker.js', { maxWorkers: 4 });
 * const result = await pool.call('compute', [data]);
 */
export class RpcClientWorkerPool extends RpcClientPool {
  constructor(url: URL | string, options?: TRpcClientWorkerPoolOptions) {
    const rpcWorkerOptions = {
      type: 'ordinary',
      workerOptions: {
        type: 'module',
        ...options?.workerOptions,
      },
    } as TRpcClientWorkerOptions;

    super({
      maxWorkers: options?.maxWorkers || 1,
      workerProvider: () => new RpcClientWorker(url, rpcWorkerOptions),
    });
  }
}
