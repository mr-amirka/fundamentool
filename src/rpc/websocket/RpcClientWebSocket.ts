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
  RpcClient,
} from '../RpcClient';
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

const WHERE = '[fundamentool] RpcClientWebSocket';

/** The options' keys. */
const OPTION_KEYS = [
  'url',
  'reconnectMs',
  'timeout',
  'WebSocket',
];

/** How long a client waits before it tries again a server that didn't answer. */
const RECONNECT_MS = 5000;

/** `readyState` of an open socket. */
const OPEN = 1;

/** The errors of a session lost on the host's side: a call of it may simply be made again. */
const lostErrors = new WeakSet<Error>();

/** The key `RpcClient.proxy()` adds to the exports itself. */
const TERMINATE = 'terminate';

/** Whether the exports hold a function to call — at any depth, `proxy()`'s own `terminate` aside. */
function hasFunctions(value: unknown, top = true): boolean {
  if (typeof value === 'function') {
    return true;
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  for (const [
    key,
    item,
  ] of Object.entries(value)) {
    if (!(top && key === TERMINATE) && hasFunctions(item, false)) {
      return true;
    }
  }
  return false;
}

/** A `WebSocket` constructor: the browser's, Node's (22+), or `ws`'s. */
export type TRpcWebSocketConstructor = new (url: string) => TRpcWebSocket;

/** `RpcClientWebSocket`'s options. */
export type TRpcClientWebSocketOptions = {
  /** The server's address, or several: each connection takes the next one in turn. */
  url: string | readonly string[];
  /** How long to wait before trying again a server that didn't answer; default 5 s. A socket that drops is tried again at once. */
  reconnectMs?: number;
  /** A call's timeout in ms, as `RpcClient`'s. */
  timeout?: number;
  /** The `WebSocket` to use; default the global one (a browser, Node 22+). In older Node — `ws`'s. */
  WebSocket?: TRpcWebSocketConstructor;
};

/** Whether the text is an address `new URL` takes. */
function isAddress(url: unknown): boolean {
  try {
    return typeof url === 'string' && Boolean(new URL(url));
  } catch {
    return false;
  }
}

/** Checks the options: an unknown key or a wrong value is an error (`api-input-validation.md`). */
function checkOptions(options: TRpcClientWebSocketOptions): void {
  if (process.env.NODE_ENV !== 'production') {
    if (options === null || typeof options !== 'object') {
      throw new TypeError(`${WHERE}: options expect an object, got ${String(options)}`);
    }
    assertKnownOptions(
      WHERE, options, OPTION_KEYS,
    );
    const urls = typeof options.url === 'string' ? [options.url] : options.url;
    if (!Array.isArray(urls) || urls.length === 0 || !urls.every(isAddress)) {
      throw new TypeError(`${WHERE}: "url" expects an address or a non-empty list of them, got ${JSON.stringify(options.url)}`);
    }
    for (const key of [
      'reconnectMs',
      'timeout',
    ] as const) {
      const value = options[key];
      if (value !== undefined && !(Number.isInteger(value) && value >= 0)) {
        throw new TypeError(`${WHERE}: "${key}" expects a whole number of ms, 0 or more, got ${String(value)}`);
      }
    }
    if (options.WebSocket === undefined && typeof globalThis.WebSocket !== 'function') {
      throw new TypeError(`${WHERE}: "WebSocket" — this runtime has no global WebSocket (Node before 22): pass ws's`);
    }
    if (options.WebSocket !== undefined && typeof options.WebSocket !== 'function') {
      throw new TypeError(`${WHERE}: "WebSocket" expects a constructor, got ${typeof options.WebSocket}`);
    }
  }
}

/**
 * An `RpcClient` over a WebSocket (fundamentool D-104), in a browser and in Node: the server is `serveRpcWebSocket`.
 * The calls live in a session that outlasts its socket — a socket that drops is opened again (the next address in
 * turn), and what either end sent meanwhile, or sent and the other didn't get, is sent again; a call waits through it.
 * A server that lost the session (it restarted, the session expired) — the calls waiting reject with "call again", and
 * `proxy()` asks for the exports again.
 *
 * `proxy()` closes the client when it fails for good — the `timeout` passed, the server answered an error — or the
 * server offers nothing to call: no socket stays alive that no one can stop, so the one-line form is safe (D-104's
 * note, `mn-utils`'s rule). A session lost meanwhile is no failure: it asks again on the next socket.
 *
 * @example
 * const client = new RpcClientWebSocket({ url: ['ws://localhost:8081'] });
 * const { log, info } = await client.proxy();
 * await log('Vasya!');                                      // 'Delivered!'
 * await info('Pupkin!', (text) => console.log(text));       // the server calls the callback
 * client.destroy();                                         // closes the socket, the server forgets the session
 */
export class RpcClientWebSocket extends RpcClient {
  private readonly link: TRpcLink;
  private readonly urls: readonly string[];
  private readonly reconnectMs: number;
  private readonly Socket: TRpcWebSocketConstructor;
  private socket: TRpcWebSocket | undefined;
  private session: string | null = null;
  private next = 0;
  private cancelRetry: () => void = noop;

  constructor(options: TRpcClientWebSocketOptions) {
    checkOptions(options);
    const link = createRpcLink();
    super({
      postMessage: link.postMessage,
      onMessage: link.onMessage,
      timeout: options.timeout,
    });
    this.link = link;
    this.urls = typeof options.url === 'string' ? [options.url] : options.url;
    this.reconnectMs = options.reconnectMs ?? RECONNECT_MS;
    this.Socket = options.WebSocket ?? (globalThis.WebSocket as unknown as TRpcWebSocketConstructor);
    this.connect();
  }

  /**
   * Closes the socket for good and tells the server to forget the session; the calls still waiting reject with `reason`.
   *
   * @param reason - What they reject with; default `Error('Client: destroyed')`.
   */
  destroy(reason?: Error) {
    this.cancelRetry();
    const socket = this.socket;
    this.socket = undefined;
    if (socket !== undefined) {
      if (socket.readyState === OPEN) {
        socket.send(JSON.stringify([TRpcFrame.Bye]));
      }
      socket.close();
    }
    super.destroy(reason);
  }

  /**
   * The server's exports as functions — and `terminate`, which ends this handshake only (`destroy()` closes the client).
   * Fails for good (the `timeout`, a server's error) or nothing to call — the client is closed, then it rejects.
   *
   * @returns The exports.
   * @example
   * const { log } = await new RpcClientWebSocket({ url, timeout: 5000 }).proxy(); // no socket left behind on a failure
   */
  async proxy(): Promise<Record<string, any>> {
    for (;;) {
      let exports: Record<string, any>;
      try {
        exports = await super.proxy();
      } catch (error) {
        if (lostErrors.has(error as Error)) {
          continue;
        }
        this.destroy(error as Error);
        throw error;
      }
      if (!hasFunctions(exports)) {
        const error = new Error(`${WHERE}: the server offers nothing to call — the client is closed`);
        this.destroy(error);
        throw error;
      }
      return exports;
    }
  }

  /** Opens a socket to the next address; when it drops, the next one — at once if it was welcomed, else later. */
  private connect() {
    const url = this.urls[this.next++ % this.urls.length];
    const socket = new this.Socket(url);
    this.socket = socket;
    let welcomed = false;
    onSocket(
      socket, 'open', () => {
        socket.send(JSON.stringify([
          TRpcFrame.Hello,
          this.session,
          this.link.received(),
        ]));
      },
    );
    onSocket(
      socket, 'message', (event: { data: unknown }) => {
        const frame = frameOf(WHERE, event.data);
        if (frame === undefined) {
          return;
        }
        if (frame[0] !== TRpcFrame.Hello) {
          this.link.receive(frame);
          return;
        }
        const session = frame[1] as string;
        if (this.session !== null && session !== this.session) {
          // The calls of the old session have no one to answer them; their messages are dropped with them
          this.link.reset();
          const lost = new Error(`${WHERE}: the server lost the session (it restarted, or the session expired) — call again`);
          lostErrors.add(lost);
          this.lose(lost);
        }
        this.session = session;
        welcomed = true;
        this.link.attach((text) => socket.send(text), frame[2] as number);
      },
    );
    // `close` follows an `error` — it is the one acted on
    onSocket(
      socket, 'error', noop,
    );
    onSocket(
      socket, 'close', () => {
        if (this.socket !== socket) {
          return;
        }
        this.socket = undefined;
        this.link.detach();
        this.cancelRetry = createTimeout(() => this.connect(), welcomed ? 0 : this.reconnectMs);
      },
    );
  }
}
