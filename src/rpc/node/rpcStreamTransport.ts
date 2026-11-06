import type {
  Duplex,
} from 'node:stream';
import {
  StringDecoder,
} from 'node:string_decoder';
import {
  assertKnownOptions,
} from '../../assertKnownOptions';
import {
  LineDecoder,
} from '../../LineDecoder';
import type {
  TRpcUnsubscribe,
} from '../types';

const WHERE = '[fundamentool] rpcStreamTransport';

/** The options' keys. */
const OPTION_KEYS = ['head'];

/** `rpcStreamTransport`'s options. */
export type TRpcStreamTransportOptions = {
  /** What was read from the stream before it was handed over — a handshake's rest: its lines are read first. */
  head?: Buffer | string;
};

/** The transport `RpcClient` and `RpcConnect` take: `{ postMessage, onMessage }`. */
export type TRpcStreamTransport = {
  /** Writes one message as a JSON line; nothing once the stream is gone. */
  postMessage(message: unknown): TRpcUnsubscribe;
  /** Calls the listener with each message read; the stream is read from the first listener on. */
  onMessage(listener: (message: any) => void): TRpcUnsubscribe;
};

const noUnsubscribe: TRpcUnsubscribe = () => undefined;

/**
 * An RPC transport over a Node stream — a socket, a child's stdio: one JSON message per line (fundamentool D-103).
 * A line that is no JSON is warned of and skipped; the next one is read. The stream stays the caller's: closing it, and
 * destroying the client or the connection when it closes, is the caller's — `client.destroy(reason)` rejects the calls
 * still waiting.
 *
 * @param stream  - The stream, both ways.
 * @param options - `head`: what was read from it already.
 * @returns `{ postMessage, onMessage }` for `new RpcClient(…)` or `new RpcConnect({ exports, … })`.
 * @throws {TypeError} An unknown option, or a `head` that is neither a Buffer nor a string.
 * @example
 * // the server: one connection per client
 * net.createServer((socket) => {
 *   const connect = new RpcConnect({ exports: { add: (a, b) => a + b }, ...rpcStreamTransport(socket) });
 *   socket.on('close', () => connect.destroy());
 * });
 * // the client
 * const client = new RpcClient(rpcStreamTransport(net.connect(path)));
 * await client.call('add', [3, 4]); // 7
 */
export function rpcStreamTransport(stream: Duplex, options: TRpcStreamTransportOptions = {}): TRpcStreamTransport {
  if (process.env.NODE_ENV !== 'production') {
    assertKnownOptions(
      WHERE, options, OPTION_KEYS,
    );
    const {
      head,
    } = options;
    if (head !== undefined && typeof head !== 'string' && !Buffer.isBuffer(head)) {
      throw new TypeError(`${WHERE}: "head" expects a Buffer or a string, got ${typeof head}`);
    }
  }
  const listeners = new Set<(message: any) => void>();
  const text = new StringDecoder('utf8');
  const lines = new LineDecoder<string>();
  const read = (chunk: Buffer | string): void => {
    for (const line of lines.write(typeof chunk === 'string' ? chunk : text.write(chunk))) {
      let message: unknown;
      try {
        message = JSON.parse(line);
      } catch {
        // eslint-disable-next-line no-console -- as RpcClient warns of a message it doesn't know
        console.warn(`${WHERE}: a line that is no JSON, skipped:`, line.slice(0, 200));
        continue;
      }
      for (const listener of listeners) {
        listener(message);
      }
    }
  };
  let reading = false;
  return {
    postMessage: (message) => {
      if (!stream.destroyed && !stream.writableEnded) {
        stream.write(`${JSON.stringify(message)}\n`);
      }
      return noUnsubscribe;
    },
    onMessage: (listener) => {
      listeners.add(listener);
      if (!reading) {
        reading = true;
        if (options.head !== undefined) {
          read(options.head);
        }
        stream.on('data', read);
        stream.resume();
      }
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
