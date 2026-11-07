import {
  attachEvent,
} from '../../attachEvent';
import {
  noop,
} from '../../noop';
import type {
  TRpcUnsubscribe,
} from '../types';

// The session core both ends of an RPC WebSocket share (fundamentool D-104): every message is numbered and kept until
// the other end says it got it, so a socket that drops loses nothing — the next socket of the session sends again what
// the other end didn't get. The design card: `PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/SPEC/rpc-websocket.md`.

/** The frames on the socket — one JSON array per WebSocket message. */
export enum TRpcFrame {
  /** `[0, session | null, received]` — the client's hello; the host's welcome answers with the session's id. */
  Hello = 0,
  /** `[1, seq, ack, message]` — a message of the RPC, numbered; `ack` — the last number this end got. */
  Data = 1,
  /** `[2, ack]` — only the last number got: for an end that hears much and says little. */
  Ack = 2,
  /** `[3]` — the client is gone for good: the host forgets its session at once. */
  Bye = 3,
}

/** A socket both the browser's `WebSocket` and `ws`'s are: what the client and the host use of it. */
export type TRpcWebSocket = {
  /** `1` — open. */
  readonly readyState: number;
  /** Sends a text frame. */
  send(data: string): void;
  /** Closes the socket. */
  close(): void;
  /** Listens for `open`, `message` (its `data` — the text), `close`, `error`. */
  addEventListener(type: string, listener: (event: any) => void): void;
  /** Stops listening. */
  removeEventListener(type: string, listener: (event: any) => void): void;
};

/** Listens to a socket's event: the socket is an event target, its type is ours. */
export const onSocket = (
  socket: TRpcWebSocket, type: string, listener: (event: any) => void,
): TRpcUnsubscribe => (
  attachEvent(
    socket as unknown as EventTarget, type, listener,
  )
);

/** After how many messages got with nothing said back an end acks them by a frame of its own. */
const ACK_EVERY = 32;

/** The session's link: `{ postMessage, onMessage }` for `RpcClient` / `RpcConnect`, and the socket's side. */
export type TRpcLink = {
  /** Numbers the message, keeps it, sends it if a socket is attached. */
  postMessage(message: unknown): TRpcUnsubscribe;
  /** Calls the listener with each message got, in order, once. */
  onMessage(listener: (message: any) => void): TRpcUnsubscribe;
  /** A socket from now on: what the other end didn't get (after its `received`) is sent again. */
  attach(send: (text: string) => void, received: number): void;
  /** No socket: messages are kept until the next one. */
  detach(): void;
  /** A `Data` or `Ack` frame from the socket. */
  receive(frame: readonly unknown[]): void;
  /** The last number got from the other end. */
  received(): number;
  /** A new session: nothing kept, numbers from the start. */
  reset(): void;
};

/**
 * A session's link (fundamentool D-104): numbered messages, kept until acked, sent again on the next socket.
 *
 * @returns The link.
 */
export function createRpcLink(): TRpcLink {
  const listeners = new Set<(message: any) => void>();
  let outbox: [seq: number, message: unknown][] = [];
  let sent = 0;
  let received = 0;
  let acked = 0;
  let send: ((text: string) => void) | undefined;
  const trim = (upTo: number): void => {
    let count = 0;
    const length = outbox.length;
    while (count < length && outbox[count][0] <= upTo) {
      count++;
    }
    if (count > 0) {
      outbox.splice(0, count);
    }
  };
  const data = (seq: number, message: unknown): string => {
    acked = received;
    return JSON.stringify([
      TRpcFrame.Data,
      seq,
      received,
      message,
    ]);
  };
  return {
    postMessage: (message) => {
      const seq = ++sent;
      outbox.push([
        seq,
        message,
      ]);
      send?.(data(seq, message));
      return noop;
    },
    onMessage: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    attach: (sender, peerReceived) => {
      send = sender;
      trim(peerReceived);
      for (const [
        seq,
        message,
      ] of outbox) {
        sender(data(seq, message));
      }
    },
    detach: () => {
      send = undefined;
    },
    receive: (frame) => {
      if (frame[0] === TRpcFrame.Ack) {
        trim(frame[1] as number);
        return;
      }
      trim(frame[2] as number);
      // A message sent again that got here before the socket dropped: already delivered
      if (frame[1] !== received + 1) {
        return;
      }
      received++;
      for (const listener of listeners) {
        listener(frame[3]);
      }
      if (send !== undefined && received - acked >= ACK_EVERY) {
        acked = received;
        send(JSON.stringify([
          TRpcFrame.Ack,
          received,
        ]));
      }
    },
    received: () => received,
    reset: () => {
      outbox = [];
      sent = 0;
      received = 0;
      acked = 0;
    },
  };
}

/** A socket's frame as an array, or `undefined` — no JSON array (warned of: as `rpcStreamTransport` skips a line). */
export function frameOf(where: string, data: unknown): unknown[] | undefined {
  try {
    const frame: unknown = JSON.parse(String(data));
    if (Array.isArray(frame)) {
      return frame;
    }
  } catch {
    // warned of below
  }
  // eslint-disable-next-line no-console -- as RpcClient warns of a message it doesn't know
  console.warn(`${where}: a frame that is no JSON array, skipped:`, String(data).slice(0, 200));
  return undefined;
}
