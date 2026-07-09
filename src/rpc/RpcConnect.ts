import {
  TRpcType,
  TRpcClientMessage,
  TRpcConnectMessage,
  TRpcConnectTask,
  TRpcConnectMessageResult,
  TRpcConnectMessageSubCall,
  TRpcEncodedData,
  TRpcAgent,
  TRpcConnectMessageSubCallResult,
  TRpcTaskContext,
  TRpcConnectOptions,
  TRpcConnectOptionsGetConnections,
  IRpcConnect,
  TRpcConnectOptionsInit,
} from './types';
import {
  Unsubscriber, 
} from '../Unsubscriber';
import {
  wait, 
} from '../wait';
import {
  RpcCoder, 
} from './RpcCoder';
import {
  getWithContext, 
} from '../get';

/**
 * Server-side RPC connection handler.
 * Receives client calls, invokes exported methods, and sends back results.
 * Supports subscriptions, callback roundtrips, and broadcast dispatch.
 *
 * @example
 * const connect = new RpcConnect({
 *   exports: { greet: (name: string) => `Hello, ${name}!` },
 *   postMessage: send,
 *   onMessage: listen,
 * });
 */
export class RpcConnect {
  static interrupt = wait;

  private nextCallbackCallIndex = 0;
  private slotTaskMap = new Map<string, TRpcConnectTask>();
  private getConnections: TRpcConnectOptionsGetConnections;
  private unsubscriber = new Unsubscriber();
  private postMessage: TRpcConnectOptions['postMessage'];
  private serializable: boolean;
  private exports: Record<string, any>;

  constructor(options: TRpcConnectOptionsInit | TRpcConnectOptions) {
    const selfOptions = {
      serializable: true,
      ...(typeof options === 'function' ? options() : options),
    };
    this.exports = selfOptions.exports;
    this.postMessage = selfOptions.postMessage;
    this.serializable = selfOptions.serializable;
    this.getConnections = selfOptions.getConnections || (() => [this as IRpcConnect]);
    this.unsubscriber.add(selfOptions.onMessage(this.handleMessage.bind(this)));
  }

  destroy() {
    this.unsubscriber.unsubscribe();
  }

  dispatch(data: any) {
    this.dispatchEncoded((new RpcCoder()).encode(data, false));
  }

  dispatchEncoded(encodedData: TRpcEncodedData) {
    this.sendMessage([TRpcType.Dispatch, encodedData]);
  }

  private sendMessage(data: TRpcConnectMessage[1]) {
    this.postMessage([TRpcAgent.Server, data] as TRpcConnectMessage);
  }
  private async invokeBase(
    requestId: string,
    encodedArgs: any,
    middleware: (args: any) => Promise<[isError: number, result: any]> | [isError: number, result: any],
  ) {
    const coder = this.serializable ? new RpcCoder((fnIndex: number) => {
      return (...params) => this.callClientFn(
        requestId, fnIndex, params,
      );
    }, {
      useSymols: true,
    }) : null;
    const signal: any = new EventTarget();
    const context: TRpcTaskContext = {
      signal,
      interrupt: wait,
      getConnections: this.getConnections,
      dispatch: (data: any) => {
        this.dispatchEncoded(coder?.encode(data, false) || data);
      },
      dispatchToAll(data: any) {
        const encodedData = coder?.encode(data, false) || data;
        for (const connection of this.getConnections()) {
          connection.dispatchEncoded(encodedData);
        }
      },
    };

    signal.aborted = false;
    signal.addEventListener('abort', () => {
      signal.aborted = true;
    });

    this.slotTaskMap.set(requestId, [
      context,
      coder,
      new Map(),
    ]);

    const [isError, result] = await middleware(coder?.decode(encodedArgs) || encodedArgs || []);

    this.sendMessage([
      TRpcType.Result,
      requestId,
      isError,
      coder?.encode(result, false) || result,
    ] as TRpcConnectMessageResult[1]);
    this.slotTaskMap.delete(requestId);
  }

  private async invoke(
    requestId: string,
    methodName: string,
    encodedArgs: any,
    middleware?: (fn: (args: any) => Promise<any>, args: any) => Promise<any>,
  ) {
    return this.invokeBase(
      requestId, encodedArgs, async (args) => {
        let result: any;
        let isError = 0;

        const methodPath = methodName.split('.');
        const exports = this.exports;
        const methodCtx = getWithContext(exports, methodPath);
        const method = methodCtx?.[1];
            
        try {
          if (method) {
            const callback = (args: any) => method.apply(methodCtx?.[0], args);
            result = await (middleware ? middleware(callback, args) : callback(args));
          } else {
            isError = 1;
            result = new Error(`Method "${methodName}" is not exist. All methods: ${
              Object.keys(exports).join(', ')
            } and their subfields`);
          }
        } catch(error: any) {
          console.error(
            'Connect:Call:error', error, {
              methodName,
              encodedArgs,
              args,
              method,
            },
          );
          isError = 1;
          result = new Error(`${methodPath}: ${error.toString()}`);
          result.name = error.name;
          result.code = error.code;
        }
        return [isError, result];
      },
    );
  }

  private async proxyProvide(args: [callback: (exports: Record<string, any>) => any]) {
    return [0, await args[0](this.exports)];
  }

  private async handleMessage(data: TRpcClientMessage) {
    if (data[0] as TRpcAgent !== TRpcAgent.Client) {
      return;
    }

    const dataArgs = data[1];
    const requestId = dataArgs[1];

    switch (dataArgs[0]) {
      case TRpcType.MetaCall: {
        const method = dataArgs[2];
        switch (method) {
          case 'proxy': {
            return this.invokeBase(
              requestId, dataArgs[3], this.proxyProvide.bind(this),
            );
          }
        }
        console.warn('Connect: Unknown meta method', data);
        return this.invokeBase(
          requestId, dataArgs[3], () => {
            return [1, new Error(`Connect: Unknown meta method: ${method}`)];
          },
        );
      }
      case TRpcType.Call:
        return this.invoke(
          requestId, dataArgs[2], dataArgs[3],
        );

      case TRpcType.Subscribe:
        return this.invoke(
          requestId, dataArgs[2], dataArgs[3], async (fn, param: [Promise<void>, any[]]) => {
            const unsubscribe = await fn(param[1]);
            await param[0];
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
          },
        );

      case TRpcType.SubCall: {
        let encodedResult: TRpcEncodedData;
        let isError = 0;

        const task = this.slotTaskMap.get(requestId);
        let args: any;

        if (task) {
          let result: TRpcEncodedData;
          const coder = task[1];

          try {
            args = coder?.decode(dataArgs[4]) || dataArgs[4] || [];
            result = await coder?.invoke(dataArgs[3], args);
          } catch (error: any) {
            console.error(
              'Connect:SubCall:error', error, args,
            );
            isError = 1;
            result = error;
          }

          encodedResult = coder?.encode(result, true) || result;
        } else {
          encodedResult = (new RpcCoder()).encode(new Error('Connect: Terminated task'));
          isError = 1;
        }

        this.sendMessage([
          TRpcType.SubResult,
          requestId,
          dataArgs[2],
          isError,
          encodedResult,
        ] as TRpcConnectMessageSubCallResult[1]);
        return;
      }

      case TRpcType.SubResult: {
        const task = this.slotTaskMap.get(requestId);
        if (!task) {
          return;
        }

        const subtask = task[2].get(dataArgs[2]);
        if (!subtask) {
          return;
        }

        subtask(task[1]?.decode(dataArgs[4], true) || dataArgs[4], dataArgs[3]);

        task[2].delete(dataArgs[2]);
        return;
      }
    }

    console.warn('Connect: Unknown client message', data);
  }

  private callClientFn(
    requestId: string, fnIndex: number, args: any[],
  ) {
    return new Promise((resolve, reject) => {
      const task = this.slotTaskMap.get(requestId);

      if (!task) {
        reject(new Error('Connect: Terminated task'));
        return;
      }

      const subCallIndex = this.nextCallbackCallIndex;

      this.nextCallbackCallIndex++;

      task[2].set(subCallIndex, (subject: any, isError) => {
        (isError ? reject : resolve)(subject);
      });

      this.sendMessage([
        TRpcType.SubCall,
        requestId,
        subCallIndex,
        fnIndex,
        task[1]?.encode(args, true),
      ] as TRpcConnectMessageSubCall[1]);
    });
  }
}
