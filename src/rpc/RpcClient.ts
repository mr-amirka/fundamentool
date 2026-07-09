import {
  TRpcType,
  TRpcClientMessage,
  TRpcConnectMessage,
  TRpcClientTask,
  TRpcClientMessageSubCall,
  TRpcAgent,
  TRpcClientMessageSubCallResult,
  TRpcClientOptions,
  TRpcClientOptionsInit,
  TRpcClientRequestOptions,
  TRpcUnsubscribe,
  IRpcClient,
} from './types';
import {
  RpcCoder, 
} from './RpcCoder';
import {
  getUniqId, 
} from './getUniqId';
import {
  attachEvent, 
} from '../attachEvent';
import {
  EventEmitter, 
} from '../EventEmitter';
import {
  Unsubscriber, 
} from '../Unsubscriber';
import {
  createTimeout, 
} from '../createTimeout';


/**
 * RPC client that sends typed method calls over a message channel
 * and resolves responses by idempotency key.
 * Supports subscriptions, callbacks, proxy generation, and abort signals.
 *
 * @example
 * const client = new RpcClient({ postMessage: send, onMessage: listen });
 * const result = await client.call('greet', ['world']); // => 'Hello, world!'
 */
export class RpcClient extends EventEmitter implements IRpcClient {
  // 'pause' и 'continue' пока не проксируются в события клиента
  static DEFAULT_EVENTS = ['abort'];

  private nextCallbackCallIndex = 0;
  private taskMap = new Map<string, TRpcClientTask>();
  private unsubscriber = new Unsubscriber();
  private proxyInstancePromise: Promise<any> | undefined;
  private postMessage: TRpcClientOptions['postMessage'];
  private timeout: number;
  private serializable: boolean;

  constructor(options: TRpcClientOptionsInit | TRpcClientOptions) {
    super();
    const selfOptions = {
      serializable: true,
      ...(typeof options === 'function' ? options() : options),
    };
    this.postMessage = selfOptions.postMessage;
    this.serializable = selfOptions.serializable;
    this.timeout = selfOptions.timeout || 0;
    this.unsubscriber.add(selfOptions.onMessage(this.handleMessage.bind(this)));
  }

  taskCount() {
    return this.taskMap.size;
  }

  destroy() {
    this.unsubscriber.unsubscribe();
    super.destroy();
  }

  call<R = any>(
    method: string, args?: any[], options?: TRpcClientRequestOptions,
  ): Promise<R> {
    return this.callBase(
      TRpcType.Call, method, args, options,
    );
  }

  on(
    event: string, args?: any[], options?: TRpcClientRequestOptions,
  ): TRpcUnsubscribe {
    let unsubscribe: any;
    this.callBase(
      TRpcType.Subscribe, event, [new Promise<void>((resolve) => {
        unsubscribe = resolve;
      }), args], options,
    );
    return unsubscribe;
  }

  proxy() {
    if (this.proxyInstancePromise) {
      return this.proxyInstancePromise;
    }

    let terminate: any;
    return this.proxyInstancePromise = new Promise((resolve, reject) => {
      this.callBase(
        TRpcType.MetaCall, 'proxy', [(exports: any) => {
          const originTerminate = exports.terminate;
          resolve({
            ...exports,
            terminate: async (...args: any[]) => {
              this.proxyInstancePromise = undefined;
              if (typeof originTerminate === 'function') {
                await originTerminate.apply(null, args);
              }
              terminate(args);
            },
          });
          return new Promise<void>((resolve) => {
            terminate = resolve;
          });
        }],
      ).catch(reject);
    });
  }


  private sendMessage(data: TRpcClientMessage[1]) {
    this.postMessage([TRpcAgent.Client, data] as TRpcClientMessage);
  }

  private sendEvent(
    requestId: string, event: string, detail?: any,
  ) {
    const task = this.taskMap.get(requestId);
    task && this.sendMessage([
      TRpcType.Event,
      requestId, 
      event,
      task[1]?.encode(detail) || detail,
    ]);
  }

  private callBase<R = any>(
    type: TRpcType.Call | TRpcType.Subscribe | TRpcType.MetaCall,
    method: string,
    args?: any[],
    options?: TRpcClientRequestOptions,
  ) {
    return new Promise<R>((resolve, reject) => {
      const requestId = getUniqId();
      const coder = this.serializable ? new RpcCoder((fnIndex) => {
        return (...params: any[]) => this.callConnectFn(
          requestId, fnIndex, params,
        );
      }, {
        useSymols: true,
      }) : null;
      const unsubscriber = new Unsubscriber();

      this.taskMap.set(requestId, [
        (subject, isError) => {
          unsubscriber.unsubscribe();
          (isError ? reject : resolve)(subject);
        },
        coder,
        new Map(),
      ]);

      if (options) {
        const timeout = options.timeout || this.timeout;
        const {
          signal,
        } = options;

        const abort = (message: string) => {
          const error = new Error(`${method}: ${message}`);
          error.name = 'AbortError';
          (error as any).code = 20;
          reject(error);
        };

        timeout && unsubscriber.add(createTimeout(() => {
          abort('The method execution timeout has been reached');
          this.sendEvent(requestId, 'abort');
        }, timeout));

        signal && [...RpcClient.DEFAULT_EVENTS, ...(options.events || [])].forEach((eventName) => {
          unsubscriber.add(attachEvent(
            signal, eventName, (e: Event) => {
              if (eventName === 'abort') {
                abort('The method execution was aborted');
              }
              this.sendEvent(
                requestId, eventName, (e as CustomEvent).detail,
              );
            },
          ));
        });
      }

      this.sendMessage([
        type,
        requestId, 
        method,
        coder?.encode(args) || args,
      ]);
    });
  }

  private async handleMessage(data: TRpcConnectMessage) {
    if (data[0] as TRpcAgent !== TRpcAgent.Server) {
      return;
    }
    const dataArgs = data[1];
    const type = dataArgs[0];
    const serializable = this.serializable;

    if (type === TRpcType.Dispatch) {
      this.emit(serializable ? (new RpcCoder()).decode(dataArgs[1]) : dataArgs[1]);
      return;
    }

    const requestId = dataArgs[1];
    const task = this.taskMap.get(requestId);

    if (!task) {
      if (dataArgs[0] !== TRpcType.SubCall) {
        return;
      }

      const error = new Error('Client: Terminated task');

      const coder = serializable ? new RpcCoder() : null;

      console.error(
        'Client:Call:SubCall', error, {
          args: coder?.decode(dataArgs[4]) || dataArgs[4] || [],
        },
      );

      this.sendMessage([
        TRpcType.SubResult,
        requestId, 
        dataArgs[2],
        1,
        coder?.encode(error) || error,
      ]);
      return;
    }

    const coder = task[1];

    switch (type) {
      case TRpcType.Result:
        task[0](coder?.decode(dataArgs[3], false) || dataArgs[3], dataArgs[2]);
        this.taskMap.delete(requestId);
        return;

      case TRpcType.SubResult: {
        const subCallIndex = dataArgs[2];
        const subtask = task[2].get(subCallIndex);

        if (subtask) {
          subtask(coder?.decode(dataArgs[4], true) || dataArgs[4], dataArgs[3]);
          task[2].delete(subCallIndex);
        }

        return;
      }

      case TRpcType.SubCall: {
        let result: any;
        let isError = 0;
        const args = coder?.decode(dataArgs[4], true) || dataArgs[4] || [];
        try {
          result = await coder?.invoke(dataArgs[3], args);
        } catch (error: any) {
          console.error(
            'Client:Call:SubCall', error, {
              args,
            },
          );
          isError = 1;
          result = error;
        }

        this.sendMessage([
          TRpcType.SubResult,
          requestId, 
          dataArgs[2],
          isError,
          coder?.encode(result) || result,
        ] as TRpcClientMessageSubCallResult[1]);
        return;
      }
    }

    console.warn('Client: Unknown server message', data);
  }

  private callConnectFn(
    requestId: string, fnIndex: number, args: any[],
  ) {
    return new Promise((resolve, reject) => {
      const task = this.taskMap.get(requestId);

      if (!task) {
        reject(new Error('Client: Terminated task'));
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
        task[1]?.encode(args) || args,
      ] as TRpcClientMessageSubCall[1]);
    });
  }
}
