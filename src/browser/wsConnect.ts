declare const WebSocket: {
  new (url: string): WebSocket;
};

/**
 * Creates a WebSocket connection and resolves with the opened socket.
 *
 * @param wsUrl - WebSocket URL (`ws://` or `wss://`).
 * @returns Promise resolved with the opened `WebSocket` instance.
 * @example
 * const socket = await wsConnect('wss://example.com/ws');
 */
export function wsConnect(wsUrl: string): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      socket.onclose = socket.onerror = null as any;
      resolve(socket);
    };
    socket.onclose = socket.onerror = reject as any;
  });
}