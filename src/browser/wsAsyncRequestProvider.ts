import {
  noop, 
} from '../noop';
import {
  once, 
} from '../once';
import {
  isEmpty, 
} from '../is/isEmpty';
import {
  stackProvider, 
} from '../stackProvider';
import {
  toText, 
} from './blob';
import {
  wsConnect, 
} from './wsConnect';

declare const Buffer: any;

let lastId = 0;

function defaultGenerateIdempotencyKey(): number {
  return ++lastId;
}

function defaultOnReconnect(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
}

function wrapError(error: any): [error: any] {
  return [error];
}

/**
 * Async/idempotent WebSocket request provider configs.
 *
 * It supports reconnect and matching responses by generated request `id`.
 */
export interface IWsAsyncConfigs {
  reconnect?: boolean;
  onMessage?: (response: any) => void | boolean;
  onError?: (error: any) => void;
  onReconnect?: (error: any, run: (method: string, data?: any) => Promise<any>) => any;
  onSuccessConnect?: () => void;
  generateIdempotencyKey?: () => number;
}

/**
 * Provides an async WebSocket request API over a single connection.
 * Internally queues requests until the socket is connected and resolves
 * promises when corresponding responses arrive, matched by idempotency key.
 *
 * @param wsUrl - WebSocket URL.
 * @param configs - Optional configuration (reconnect, handlers).
 * @returns An async `request(method, data)` function with `.close()` and `.reset()` methods.
 * @example
 * const request = wsAsyncRequestProvider('wss://example.com/ws');
 * const response = await request('getUser', { id: 1 });
 */
export function wsAsyncRequestProvider<TResponse = any>(wsUrl: string,
  configs?: IWsAsyncConfigs) {
  configs = configs || {};
  const _reconnect = configs.reconnect;
  const _onMessage = configs.onMessage || noop;
  const _onError = configs.onError || noop;
  const _onReconnect = configs.onReconnect || defaultOnReconnect;
  const _onSuccessConnect = configs.onSuccessConnect || noop;
  const _generateIdempotencyKey =
    configs.generateIdempotencyKey || defaultGenerateIdempotencyKey;
  const stackAfter = stackProvider<any[]>();
  const stackMain = stackProvider<any[]>();
  const expectedAfter = expectedResponsesProvider();
  const expectedMain = expectedResponsesProvider();
  // internal state
  let socket: WebSocket | undefined;
  let reconnection = 0;
  let closed = 0;
  let connectionError: any;
  let cancelConnect: () => void = noop;

  function expectedResponsesProvider() {
    let messages: Record<string | number, any[]> = {};
    function send(item: any[]): void {
      const args = item[2];
      const id = item[3];
      if (
        args &&
        socket
      ) {
        messages[id] = item;
        socket.send(Buffer.from(JSON.stringify({
          id,
          method: args[0],
          data: args[1],
        }),
        'utf-8'));
      }
    }
    function each(iteratee: (item: any[]) => void): void {
      // eslint-disable-next-line guard-for-in
      for (const id in messages) {
        iteratee(messages[id]);
      }
    }
    return {
      each,
      send,
      sendAll: () => {
        each(send);
      },
      apply: (response: any) => {
        const id = response.id;
        const item = messages[id];
        if (item) {
          delete messages[id];
          item[0](response);
        }
      },
      error: (error: any) => {
        const msgs = messages;
        messages = {};
        // eslint-disable-next-line guard-for-in
        for (const id in msgs) {
          msgs[id][1](error);
        }
      },
      isEmpty: () => isEmpty(messages),
    };
  }

  function destroy(): void {
    cancelConnect();
    if (socket) {
      socket.close(1000, 'Connection closed');
      (socket as any).onclose =
        (socket as any).onerror =
        (socket as any).onmessage =
        (socket as any).onopen =
          null;
      socket = undefined;
    }
  }

  function reconnect(error: any, lazy?: boolean): any {
    if (closed) {
      return expectedMain.error(error);
    }
    reconnection = 1;
    if (lazy) {
      return connect(onOpen, onError);
    }
    let hasAfterRequest = 0;
    let hasEnd = 0;
    const promises: Promise<any>[] = [];

    function onReconnectCallback(method: string, data?: any): Promise<any> {
      const promise = new Promise((resolve, reject) => {
        if (hasEnd) {
          reject(new Error('The executor has already returned a result'));
          return;
        }
        stackAfter.push([
          resolve,
          reject,
          [method, data],
          _generateIdempotencyKey(),
        ]);
        if (!hasAfterRequest) {
          hasAfterRequest = 1;
          connect(() => {
            stackAfter.eachPop(expectedAfter.send);
          },
          () => {
            expectedAfter.error(error);
            stackAfter.eachPop((item) => {
              item[1](error);
            });
            reconnect(error);
          });
        }
      });
      promises.push(promise);
      return promise;
    }
    
    Promise
      .resolve()
      .then(() => _onReconnect(error, onReconnectCallback))
      .catch(wrapError)
      .then((errorBox) => {
        hasEnd = 1;
        if (closed) {
          return;
        }
        if (hasAfterRequest) {
          Promise.all(promises).then(wrapError).then(() => {
            if (socket) {
              (socket as any).onclose = (socket as any).onerror = once((err2: any) => {
                destroy();
                onError(err2);
                _onError(err2);
              });
              expectedMain.sendAll();
              onOpen();
            }
          });
          return;
        }
        const err = errorBox?.[0];
        if (err) {
          expectedMain.error(err);
          reconnection = 0;
          return;
        }
        expectedMain.each(stackMain.push);
        connect(onOpen, onError);
      });
  }

  function onError(error: any): void {
    _reconnect || reconnection || stackMain.has() || !expectedMain.isEmpty()
      ? reconnect(error)
      : (connectionError = error);
  }

  function onOpen(): void {
    reconnection = 0;
    _onSuccessConnect();
    stackMain.eachPop(expectedMain.send);
  }

  function _onData(response: any): void {
    response = JSON.parse(response);
    if (_onMessage(response) !== false) {
      expectedAfter.apply(response);
      expectedMain.apply(response);
    }
  }

  function onMessage(e: MessageEvent): void {
    toText((e as any).data)
      .then(_onData)
      .catch(_onError);
  }

  function connect(onConnect: () => void, onErrorFn: (error: any) => void): void {
    const onCatch = once((error: any) => {
      destroy();
      onErrorFn(error);
      _onError(error);
    });
    const promise: any = wsConnect(wsUrl).then((_socket: WebSocket) => {
      socket = _socket;
      (socket as any).onmessage = onMessage;
      (socket as any).onclose = (socket as any).onerror = onCatch;
      onConnect();
    },
    onCatch);
    cancelConnect = promise.cancel || noop;
  }

  function request(method: string, data?: any): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      if (closed) {
        reject(new Error('Connection is closed'));
        return;
      }

      if (connectionError) {
        reconnect(connectionError, true);
        connectionError = 0;
      }

      const item = [
        resolve,
        reject,
        [method, data],
        _generateIdempotencyKey(),
      ];

      if (reconnection) {
        stackMain.push(item);
      } else if (socket) {
        expectedMain.send(item);
      } else {
        reconnection = 1;
        stackMain.push(item);
        connect(onOpen, onError);
      }
    });
  }

  (request as any).close = () => {
    closed = 1;
    destroy();
  };
  (request as any).reset = destroy;

  return request as any;
}

