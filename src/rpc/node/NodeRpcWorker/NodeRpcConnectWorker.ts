import {
  parentPort,
} from 'node:worker_threads';
import type {
  TRpcConnectOptionsPostMessage,
} from "../../types";
import { RpcConnect } from "../../RpcConnect";

/**
 * Server-side RPC handler that runs inside a Node.js `worker_threads` Worker.
 * Call `NodeRpcConnectWorker.run(exports)` at the top of the worker script to wire up the server.
 *
 * @example
 * // inside worker.js
 * await NodeRpcConnectWorker.run({ greet: (name) => `Hello, ${name}!` });
 */
export class NodeRpcConnectWorker extends RpcConnect {
  static async run(exports: Record<string, any>) {
    return new RpcConnect({
      postMessage: parentPort.postMessage.bind(parentPort) as TRpcConnectOptionsPostMessage,
      onMessage: (listener: (data: any) => void) => {
        parentPort.on('message', listener);
        return () => {
          parentPort.off('message', listener);
        };
      },
      exports,
    });
  }
}
