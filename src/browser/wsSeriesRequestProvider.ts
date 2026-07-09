import {
  noop, 
} from '../noop';
import {
  once, 
} from '../once';
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

function defaultOnReconnect(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
}

export interface IWsSeriesConfigs {
  onError?: (error: any) => void;
  onMessage?: (response: any) => void | boolean;
  onReconnect?: () => Promise<any> | any;
}

/**
 * Provides a simple sequential WebSocket request API over a single connection.
 * Requests are executed one-by-one: the next request is sent only after the
 * previous response is received.
 *
 * @param wsUrl - WebSocket URL.
 * @param configs - Optional configuration (error/message/reconnect handlers).
 * @returns An async `request(method, data)` function.
 * @example
 * const request = wsSeriesRequestProvider('wss://example.com/ws');
 * const response = await request('getUser', { id: 1 });
 */
export function wsSeriesRequestProvider<TResponse = any>(wsUrl: string,
  configs?: IWsSeriesConfigs) {
  configs = configs || {};
  const _onError = configs.onError || noop;
  const _onMessage = configs.onMessage || noop;
  const _onReconnect = configs.onReconnect || defaultOnReconnect;
  let reconnection: number | undefined;
  let socket: WebSocket | undefined;
  let cancelConnect: () => void = noop;
  const requests = stackProvider<any[]>();
  const responses = stackProvider<any[]>();

  function socketApplyBase(item?: any[], args?: any[]): void {
    if (!item) {
      return;
    }
    args = item[2];
    if (!args || !socket) {
      return;
    }
    responses.push(item);
    socket.send(Buffer.from(JSON.stringify({
      method: args[0],
      data: args[1],
    }),
    'utf-8'));
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

  function connect(): void {
    if (reconnection) {
      return;
    }
    reconnection = 1;
    const onCatch = once((error: any, item?: any[]) => {
      destroy();
      Promise.resolve(_onReconnect()).then(() => {
        reconnection = 0;
        connect();
      });
      (item = responses.pop()) && item[1](error);
      _onError(error);
    });
    const promise: any = wsConnect(wsUrl).then((_socket: WebSocket) => {
      socket = _socket;
      (socket as any).onmessage = onMessage;
      (socket as any).onclose = (socket as any).onerror = onCatch;
      reconnection = 0;
      socketApplyBase(requests.pop());
    },
    onCatch);
    cancelConnect = promise.cancel || noop;
  }

  function _onData(response: any, item?: any[]): void {
    response = JSON.parse(response);
    if (_onMessage(response) !== false) {
      (item = responses.pop()) && item[0](response);
    }
  }

  function onMessage(e: MessageEvent): void {
    toText((e as any).data)
      .then(_onData)
      .catch(_onError);
    socketApplyBase(requests.pop());
  }

  return (method: string, data?: any): Promise<TResponse> => {
    return new Promise<TResponse>((resolve, reject) => {
      const item = [
        resolve,
        reject,
        [method, data],
      ];
      if (socket) {
        socketApplyBase(item);
      } else {
        requests.push(item);
        connect();
      }
    });
  };
}

