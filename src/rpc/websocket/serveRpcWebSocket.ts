import {
  assertKnownOptions,
} from '../../assertKnownOptions';
import {
  createTimeout,
} from '../../createTimeout';
import {
  noop,
} from '../../noop';
import {
  RpcConnect,
} from '../RpcConnect';
import type {
  IRpcConnect,
  TRpcConnectOptionsExports,
} from '../types';
import {
  createRpcLink,
  frameOf,
  onSocket,
  TRpcFrame,
} from './link';
import type {
  TRpcLink,
  TRpcWebSocket,
} from './link';

const WHERE = '[fundamentool] serveRpcWebSocket';

/** The options' keys. */
const OPTION_KEYS = [
  'server',
  'exports',
  'sessionMs',
];

/** How long a session waits for its client's next socket: a day, as `mn-utils`'s host kept it. */
const SESSION_MS = 24 * 60 * 60 * 1000;

const CONNECTION = 'connection';

/** A WebSocket server: `ws`'s `WebSocketServer`, or any that tells of its sockets so. */
export type TRpcWebSocketServer = {
  /** Listens for the sockets. */
  on(event: 'connection', listener: (socket: TRpcWebSocket) => void): unknown;
  /** Stops. */
  off(event: 'connection', listener: (socket: TRpcWebSocket) => void): unknown;
};

/** `serveRpcWebSocket`'s options. */
export type TServeRpcWebSocketOptions = {
  /** The WebSocket server — the caller's: it opens and closes it (`new WebSocketServer({ port })` of `ws`). */
  server: TRpcWebSocketServer;
  /** The methods the clients call. */
  exports: TRpcConnectOptionsExports;
  /** How long a session whose socket dropped waits for the next one; default a day. Its calls go on meanwhile. */
  sessionMs?: number;
};

/** The served host. */
export type TRpcWebSocketHost = {
  /** The sessions it keeps: those with a socket and those waiting for one. */
  sessions(): number;
  /** Stops serving: every session forgotten, its socket closed; the server stays the caller's. */
  close(): void;
};

/** One client's session: its RPC connection, its socket while it has one, its expiry while it has none. */
type TSession = {
  link: TRpcLink;
  connect: RpcConnect;
  socket: TRpcWebSocket | undefined;
  expire: () => void;
};

/** Checks the options: an unknown key or a wrong value is an error (`api-input-validation.md`). */
function checkOptions(options: TServeRpcWebSocketOptions): void {
  if (process.env.NODE_ENV !== 'production') {
    if (options === null || typeof options !== 'object') {
      throw new TypeError(`${WHERE}: options expect an object, got ${String(options)}`);
    }
    assertKnownOptions(
      WHERE, options, OPTION_KEYS,
    );
    const {
      server, exports, sessionMs,
    } = options;
    if (server === null || typeof server !== 'object' || typeof server.on !== 'function' || typeof server.off !== 'function') {
      throw new TypeError(`${WHERE}: "server" expects a WebSocket server (ws's WebSocketServer), got ${String(server)}`);
    }
    if (exports === null || typeof exports !== 'object') {
      throw new TypeError(`${WHERE}: "exports" expects an object of methods, got ${String(exports)}`);
    }
    if (sessionMs !== undefined && !(Number.isInteger(sessionMs) && sessionMs > 0)) {
      throw new TypeError(`${WHERE}: "sessionMs" expects a whole number of ms above 0, got ${String(sessionMs)}`);
    }
  }
}

/**
 * Serves `exports` over a WebSocket server to `RpcClientWebSocket`s (fundamentool D-104): one RPC connection per
 * client's session, which outlasts its socket — the client's next socket finds the session's calls still going, and
 * what was sent meanwhile is sent then. A session whose socket stays away `sessionMs` is forgotten; its client calls
 * again. `dispatchToAll` of a call reaches every session.
 *
 * @param options - The server, the exports, how long a session waits.
 * @returns `{ sessions, close }`.
 * @throws {TypeError} Wrong options.
 * @example
 * import { WebSocketServer } from 'ws';
 * const server = new WebSocketServer({ port: 8081 });
 * serveRpcWebSocket({
 *   server,
 *   exports: {
 *     log: (...args) => { console.log(...args); return 'Delivered!'; },
 *     info: async (text, callback) => { console.info(text); await callback('on the server!'); throw new Error('a mistake!'); },
 *   },
 * });
 */
export function serveRpcWebSocket(options: TServeRpcWebSocketOptions): TRpcWebSocketHost {
  checkOptions(options);
  const {
    server, exports,
  } = options;
  const sessionMs = options.sessionMs ?? SESSION_MS;
  const sessions = new Map<string, TSession>();
  const connections = (): IRpcConnect[] => [...sessions.values()].map((session) => session.connect);
  const forget = (id: string): void => {
    const session = sessions.get(id);
    if (session !== undefined) {
      sessions.delete(id);
      session.expire();
      session.connect.destroy();
      session.socket?.close();
    }
  };
  const open = (): [string, TSession] => {
    const id = globalThis.crypto.randomUUID();
    const link = createRpcLink();
    const session: TSession = {
      link,
      connect: new RpcConnect({
        exports,
        getConnections: connections,
        postMessage: link.postMessage,
        onMessage: link.onMessage as any,
      }),
      socket: undefined,
      expire: noop,
    };
    sessions.set(id, session);
    return [
      id,
      session,
    ];
  };
  const onConnection = (socket: TRpcWebSocket): void => {
    let id: string | undefined;
    onSocket(
      socket, 'message', (event: { data: unknown }) => {
        const frame = frameOf(WHERE, event.data);
        if (frame === undefined) {
          return;
        }
        if (id === undefined) {
          if (frame[0] !== TRpcFrame.Hello) {
            socket.close();
            return;
          }
          const known = sessions.get(frame[1] as string);
          const fresh = known === undefined;
          const [
            opened,
            session,
          ] = fresh ? open() : [
            frame[1] as string,
            known as TSession,
          ];
          id = opened;
          session.expire();
          // A socket of the session still open (a half-open one the client gave up): the new one replaces it
          const previous = session.socket;
          session.socket = socket;
          previous?.close();
          socket.send(JSON.stringify([
            TRpcFrame.Hello,
            id,
            session.link.received(),
          ]));
          session.link.attach((text) => socket.send(text), fresh ? 0 : frame[2] as number);
          return;
        }
        if (frame[0] === TRpcFrame.Bye) {
          forget(id);
          return;
        }
        sessions.get(id)?.link.receive(frame);
      },
    );
    onSocket(
      socket, 'error', noop,
    );
    onSocket(
      socket, 'close', () => {
        const session = id === undefined ? undefined : sessions.get(id);
        if (session?.socket !== socket) {
          return;
        }
        const ending = id as string;
        session.socket = undefined;
        session.link.detach();
        session.expire = createTimeout(() => forget(ending), sessionMs);
      },
    );
  };
  server.on(CONNECTION, onConnection);
  return {
    sessions: () => sessions.size,
    close: () => {
      server.off(CONNECTION, onConnection);
      for (const id of [...sessions.keys()]) {
        forget(id);
      }
    },
  };
}
