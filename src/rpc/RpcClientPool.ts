import type {
  TRpcClientRequestOptions,
  TRpcUnsubscribe,
  IRpcClient,
} from './types';
import {
  EventEmitter, 
} from '../EventEmitter';

/** Options for `RpcClientPool`. */
export type TRpcClientPoolOptions<Client extends IRpcClient = IRpcClient> = {
  /** Maximum number of workers to create (default: 1). */
  maxWorkers?: number,
  /** Factory that creates a new `RpcClient` instance. */
  workerProvider: () => Client;
};

/** Factory function that returns `TRpcClientPoolOptions` (used for lazy init). */
export type TRpcClientWorkerPoolOptionsInit<
  Client extends IRpcClient = IRpcClient,
> = () => TRpcClientPoolOptions<Client>;

/**
 * Pool of `RpcClient` instances that distributes calls to the least-busy worker.
 *
 * @example
 * const pool = new RpcClientPool({ maxWorkers: 4, workerProvider: () => new RpcClient(opts) });
 * const result = await pool.call('compute', [data]);
 */
export class RpcClientPool<Client extends IRpcClient = IRpcClient> extends EventEmitter implements IRpcClient {
  private maxWorkers = 1;
  private workers: Client[] = [];
  private workerProvider: () => Client;

  /**
   * Pre-creates exactly `count` workers (cycling through slots up to `maxWorkers`).
   * Useful in tests to ensure workers exist before attaching servers.
   *
   * @param count - Number of worker instances to pre-create.
   * @returns Array of the created/existing worker instances.
   */
  getWorkers(count = 0) {
    const {
      workers,
      maxWorkers,
    } = this;
    const output: Client[] = new Array(count);

    let i = 0;
    let wi = 0;
    while (i < count) {
      wi = i % maxWorkers;
      output[i] = workers[wi] || (workers[wi] = this.workerProvider());
      i++;
    }

    return output;
  }

  /**
   * Returns the least-busy worker, creating a new one if a slot is free.
   * If all slots are busy, returns the worker with the fewest active tasks.
   *
   * @returns The selected `Client` instance.
   */
  getWorker(): Client {
    const {
      workers,
      maxWorkers,
    } = this;
    const taskCounts: [
      workerIndex: number,
      taskCount: number,
    ][] = [];

    let worker: Client | undefined;
    let i = 0;
    let taskCount = 0;

    while (i < maxWorkers) {
      worker = workers[i];

      if (!worker) {
        return workers[i] = this.workerProvider();
      }

      taskCount = worker.taskCount();

      if (taskCount < 1) {
        return worker;
      }

      taskCounts[i] = [i, taskCount];

      i++;
    }

    taskCounts.sort((a, b) => a[1] - b[1]);

    return workers[taskCounts[0][0]];
  }

  constructor(options: TRpcClientWorkerPoolOptionsInit<Client> | TRpcClientPoolOptions<Client>) {
    super();

    const selfOptions = typeof options === 'function' ? options() : options;
    this.workerProvider = selfOptions.workerProvider;
    this.maxWorkers = selfOptions.maxWorkers || 1;
  }

  /** Destroys all workers in the pool and the pool itself. */
  destroy() {
    for (const worker of this.workers) {
      worker.destroy();
    }
    super.destroy();
  }

  /** Routes the call to the least-busy worker. */
  call<A extends any[] = any[], R = any>(...args: [
    method: string,
    args?: A,
    options?: TRpcClientRequestOptions,
  ]): Promise<R> {
    return this.getWorker().call(...args);
  }

  /** Routes the subscription to the least-busy worker. */
  on(...args: [
    event: string,
    args?: any[],
    options?: TRpcClientRequestOptions,
  ]): TRpcUnsubscribe {
    return this.getWorker().on(...args);
  }

  /** Returns a proxy from the least-busy worker. */
  proxy(): Promise<Record<string, any>> {
    return this.getWorker().proxy();
  }

  /** Returns the total number of pending tasks across all workers. */
  taskCount() {
    return this.workers.reduce((a, w) => a + w.taskCount(), 0);
  }
}
