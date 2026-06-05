import { GLOBAL_CONTEXT } from "../../../globalContext";
import type {
  TRpcConnectOptionsPostMessage,
  TRpcConnectOptionsOnMessage
} from "../../types";
import { RpcConnect } from "../../RpcConnect";
import { SyntheticWorker } from "../SyntheticWorker";
import { onRpcMessageProvider } from "./onRpcMessageProvider";


/**
 * Server-side RPC handler that runs inside a browser Worker (ordinary, shared, or synthetic).
 * Call `RpcConnectWorker.run(exports)` at the top of the worker script to wire up the server.
 *
 * @example
 * // inside worker.js
 * await RpcConnectWorker.run({ greet: (name) => `Hello, ${name}!` });
 */
export class RpcConnectWorker extends RpcConnect {
  static async run(exports: Record<string, any>) {
    /*
      Зафиксируем, что произведена ининциализация основного воркера
      и проверим, находимся ли Мы в дочернем воркере
    */
    if (await SyntheticWorker.incrementIndex() > 1) {
      const syntheticWorker = await SyntheticWorker.connect();
      new RpcConnect({
        postMessage: syntheticWorker.postMessage.bind(syntheticWorker) as TRpcConnectOptionsPostMessage,
        onMessage: onRpcMessageProvider(syntheticWorker) as TRpcConnectOptionsOnMessage,
        exports,

        // Внутри одного потока сериализация не нужна
        serializable: false,
      });
      syntheticWorker.start();
      return;
    }

    /*
      Если это SharedWorker.
      В SharedWorker нет метода postMessage
    */
    if (!GLOBAL_CONTEXT.postMessage) {
      const connections: RpcConnect[] = [];
      const getConnections = () => connections;

      GLOBAL_CONTEXT.addEventListener('connect', (e: any) => {
        console.log('RpcConnectWorker: connect');
        const source: MessagePort = e.source;

        connections.push(new RpcConnect({
          getConnections,
          postMessage: source.postMessage.bind(source) as TRpcConnectOptionsPostMessage,
          onMessage: onRpcMessageProvider(source) as TRpcConnectOptionsOnMessage,
          exports,
        }));

        source.start();
      }, false);
      return;
    }

    /*
      Если это обычный Worker или окно
    */
    new RpcConnect({
      postMessage: GLOBAL_CONTEXT.postMessage.bind(GLOBAL_CONTEXT) as TRpcConnectOptionsPostMessage,
      onMessage: onRpcMessageProvider(GLOBAL_CONTEXT) as TRpcConnectOptionsOnMessage,
      exports,
    });
  }
}
