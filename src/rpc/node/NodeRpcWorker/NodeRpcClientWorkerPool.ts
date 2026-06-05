import { RpcClientPool } from "../../RpcClientPool";
import { NodeRpcClientWorker, TNodeRpcClientWorkerOptions } from "./NodeRpcClientWorker";

/** Options for `NodeRpcClientWorkerPool`. */
export type TNodeRpcClientWorkerPoolOptions = TNodeRpcClientWorkerOptions & {
  /** Maximum number of worker threads to spawn (default: 1). */
  maxWorkers?: number,
};

/**
 * Pool of `NodeRpcClientWorker` instances that distributes calls to the least-busy worker.
 *
 * @example
 * const pool = new NodeRpcClientWorkerPool('./worker.js', { maxWorkers: 4 });
 * const result = await pool.call('compute', [data]);
 * pool.destroy();
 */
export class NodeRpcClientWorkerPool extends RpcClientPool {
  constructor(url: string, options?: TNodeRpcClientWorkerPoolOptions) {
    const rpcWorkerOptions = {
      workerData: options?.workerData,
      onError: options?.onError,
    } as TNodeRpcClientWorkerOptions;

    super({
      maxWorkers: options?.maxWorkers || 1,
      workerProvider: () => new NodeRpcClientWorker(url, rpcWorkerOptions),
    });
  }
}
