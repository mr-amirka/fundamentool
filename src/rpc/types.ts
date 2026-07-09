import {
  IEventEmitter, 
} from '../EventEmitter';

// ── Agents ─────────────────────────────────────────────────────────────────

/** Identifies which side of the channel sent a message. */
export enum TRpcAgent {
  /** Message originated from the server (RpcConnect side). */
  Server = 0,
  /** Message originated from the client (RpcClient side). */
  Client = 1,
}

// ── Message types ──────────────────────────────────────────────────────────

/** All possible RPC message types used on the wire. */
export enum TRpcType {
  /** Regular method call from client to server. */
  Call = 0,
  /** Response from server to client. */
  Result = 1,
  /** Cross-thread sub-call (server calling a function passed as an argument). */
  SubCall = 2,
  /** Response to a sub-call. */
  SubResult = 3,
  /** Event emitted by the client side. */
  Event = 4,
  /** Server pushes data to the client without a request. */
  Dispatch = 5,
  /** Subscribe to server-side events. */
  Subscribe = 6,
  /** Meta call (introspection, e.g. `proxy()`). */
  MetaCall = 7,
}

// ── Wire-format message types ──────────────────────────────────────────────

/** Base wire-format envelope for any RPC message. */
export type TRpcMessage<
  Agent extends TRpcAgent,
  Type extends TRpcType,
  Data extends any[],
> = [
  agent: Agent,
  args: [
    type: Type,
    requestId: string,
    ...Data,
  ],
];

/** Wire-format envelope for sub-call messages (both directions). */
export type TRpcMessageSubCall<
  Agent extends TRpcAgent,
  Type extends TRpcType.SubCall | TRpcType.SubResult,
  Data extends any[],
> = TRpcMessage<Agent, Type, [
  subCallIndex: number,
  ...Data,
]>;

/** Client → server: regular call / subscribe / meta-call. */
export type TRpcClientMessageCall = TRpcMessage<TRpcAgent.Client, TRpcType.Call | TRpcType.Subscribe | TRpcType.MetaCall, [
  method: string,
  encodedArgs: any,
]>;

/** Client → server: invoke a function that was passed as an argument. */
export type TRpcClientMessageSubCall = TRpcMessageSubCall<TRpcAgent.Client, TRpcType.SubCall, [
  fnIndex: number,
  encodedArgs: any,
]>;

/** Client → server: result of a server-initiated sub-call. */
export type TRpcClientMessageSubCallResult = TRpcMessageSubCall<TRpcAgent.Client, TRpcType.SubResult, [
  isError: 0 | 1,
  encodedResult: any,
]>;

/** Client → server: event emission. */
export type TRpcClientMessageEvent = TRpcMessage<TRpcAgent.Client, TRpcType.Event, [
  event: string,
  encodedDetail: any,
]>;

/** Union of all messages the client can send. */
export type TRpcClientMessage = TRpcClientMessageCall
  | TRpcClientMessageSubCall
  | TRpcClientMessageEvent
  | TRpcClientMessageSubCallResult;

/** Server → client: result of a call (success or error). */
export type TRpcConnectMessageResult = TRpcMessage<TRpcAgent.Server, TRpcType.Result, [
  isError: 0 | 1,
  encodedResult: any,
]>;

/** Server → client: server-push without a prior request. */
export type TRpcConnectMessageDispatch = [
  agent: TRpcAgent.Server,
  args: [
    type: TRpcType.Dispatch,
    encodedData: any,
  ],
];

/** Server → client: invoke a function passed by the client as an argument. */
export type TRpcConnectMessageSubCall = TRpcMessageSubCall<TRpcAgent.Server, TRpcType.SubCall, [
  fnIndex: number,
  encodedArgs: any,
]>;

/** Server → client: result of a client-initiated sub-call. */
export type TRpcConnectMessageSubCallResult = TRpcMessageSubCall<TRpcAgent.Server, TRpcType.SubResult, [
  isError: 0 | 1,
  encodedResult: any,
]>;

/** Union of all messages the server can send. */
export type TRpcConnectMessage = TRpcConnectMessageSubCall
  | TRpcConnectMessageResult
  | TRpcConnectMessageSubCallResult
  | TRpcConnectMessageDispatch;

// ── Encoding ───────────────────────────────────────────────────────────────

/** Discriminant tag for the encoded-value union. */
export enum TRpcEncodedType {
  Other = 0,
  Symbol = 1,
  BigInt = 2,
  String = 3,
  Function = 4,
  Object = 5,
  Array = 6,
  Date = 7,
  RegExp = 8,
  Promise = 9,
  Error = 10,
}

/** Sub-tag for `TRpcEncodedType.Other` — non-JSON-serializable primitives. */
export enum TRpcEncodedValueOther {
  Undefined = 0,
  NaN = 1,
  Infinity = 2,
  NegativeInfinity = 3,
}

/** Encoded representation of a Symbol: `[external, symbolIndex, stringIndex]`. */
export type TRpcEncodedValueSymbol = [external: 0 | 1, symbolIndex: number, stringIndex: number];

/** Encoded representation of a function: `[external, fnIndex]`. */
export type TRpcEncodedValueFn = [external: 0 | 1, fnIndex: number];

/** Any function that can be used as an RPC argument or return value. */
export type TRpcFn = (...args: any[]) => any | Promise<any>;

/** Encodes a function reference into its wire representation. */
export type TRpcFnEncode = (value: TRpcFn) => TRpcEncodedValueFn;

/** Decodes a wire function reference back into a callable. */
export type TRpcFnDecode = (value: TRpcEncodedValueFn) => TRpcFn;

/** Tagged-union type for a single encoded value on the wire. */
export type TRpcEncodedValue = number | null | boolean | [
  type: TRpcEncodedType.Other,
  value: TRpcEncodedValueOther,
] | [
  type: TRpcEncodedType.Symbol,
  value: TRpcEncodedValueSymbol,
] | [
  type: TRpcEncodedType.BigInt,
  stringIndex: number,
] | [
  type: TRpcEncodedType.String,
  stringIndex: number,
] | [
  type: TRpcEncodedType.Function,
  value: TRpcEncodedValueFn,
] | [
  type: TRpcEncodedType.Array,
  arrayIndex: number,
] | [
  type: TRpcEncodedType.Object,
  objectIndex: number,
] | [
  type: TRpcEncodedType.Date,
  time: number,
] | [
  type: TRpcEncodedType.RegExp,
  stringIndex: number,
] | [
  type: TRpcEncodedType.Promise,
  value: TRpcEncodedValueFn,
] | [
  type: TRpcEncodedType.Error,
  objectIndex: number,
];

/** Encoded object key-value pair: `[stringIndex, encodedValue]`. */
export type TRpcEncodedKeyValue = [stringIndex: number, TRpcEncodedValue];

/** Encoded array: flat list of encoded values. */
export type TRpcEncodedDataArray = TRpcEncodedValue[];

/** Encoded object: list of key-value pairs. */
export type TRpcEncodedDataObject = TRpcEncodedKeyValue[];

/**
 * Full encoded payload transmitted on the wire.
 * Contains a root value plus interned string/object/array pools,
 * or a primitive shorthand when the value is a simple JSON-safe type.
 */
export type TRpcEncodedData = [
  value: TRpcEncodedValue,
  objects: TRpcEncodedDataObject[],
  arrays: TRpcEncodedDataArray[],
  strings: string[],
] | null | undefined | number | string;

/** Resolves an external function index to a callable that returns a Promise. */
export type TRpcExtrernalFnProvider = (fnIndex: number) => ((...args: any[]) => Promise<any>);

/** `AbortSignal`-compatible object used to cancel in-flight RPC calls. */
export type TRpcEventTarget = EventTarget & {
  readonly aborted: boolean,
};

/** Interface for the argument encoder/decoder used by `RpcClient` and `RpcConnect`. */
export type TRpcCoder = {
  /** Encodes any JavaScript value into a wire-safe `TRpcEncodedData`. */
  encode: (value: any, withInternalFns?: boolean) => TRpcEncodedData,
  /** Decodes a wire-safe `TRpcEncodedData` back to a JavaScript value. */
  decode: (
    encodedData: TRpcEncodedData | undefined | null,
    withInternalFns?: boolean,
  ) => any,
  /** Invokes a locally-registered function by its index with the given args. */
  invoke: (fnIndex: number, args: any[]) => any | Promise<any>,
};

// ── Tasks ──────────────────────────────────────────────────────────────────

/** Resolves a pending RPC task with a result or error. */
export type TRpcTaskResolve = (result: any, isError: 0 | 1) => void;

/** Internal state for a pending client-side call. */
export type TRpcClientTask = [
  resolve: TRpcTaskResolve,
  coder: TRpcCoder | null,
  subtasks: Map<number, TRpcTaskResolve>,
];

/** Internal state for an active server-side call. */
export type TRpcConnectTask = [
  context: TRpcTaskContext,
  coder: TRpcCoder | null,
  subtasks: Map<number, TRpcTaskResolve>,
];

// ── Public options ─────────────────────────────────────────────────────────

/** Function returned by subscriptions and `on()` — call it to unsubscribe. */
export type TRpcUnsubscribe = () => void;

/**
 * Per-call options for `RpcClient.call()`.
 *
 * @example
 * const ctrl = new AbortController();
 * client.call('longTask', [], { signal: ctrl.signal, timeout: 5000 });
 * ctrl.abort(); // cancels the call
 */
export type TRpcClientRequestOptions = {
  /** Maximum ms to wait before rejecting with a timeout error. */
  timeout?: number,
  /** AbortSignal-compatible object — abort it to cancel the call. */
  signal?: EventTarget,
  /** List of event names the server may emit during this call. */
  events?: string[],
};

/** Shared base options for both `RpcClient` and `RpcConnect`. */
export type TRpcOptions = {
  /** When `true`, arguments are serialized before sending (required across Worker boundaries). */
  serializable?: boolean,
};

/** Function that sends a message to the remote end; returns an unsubscribe fn. */
export type TRpcClientOptionsPostMessage = (requestData: TRpcClientMessage) => TRpcUnsubscribe;

/** Callback type for incoming server messages. */
export type TRpcClientOptionsOnMessageCallback = (responseData: TRpcConnectMessage) => void;

/** Registers a listener for incoming messages; returns an unsubscribe fn. */
export type TRpcClientOptionsOnMessage = (callback: TRpcClientOptionsOnMessageCallback) => TRpcUnsubscribe;

/**
 * Options passed to `new RpcClient(options)`.
 *
 * @example
 * new RpcClient({
 *   postMessage: (data) => worker.postMessage(data),
 *   onMessage: (cb) => { worker.on('message', cb); return () => worker.off('message', cb); },
 * });
 */
export type TRpcClientOptions = TRpcOptions & {
  /** Sends a message to the server. */
  postMessage: TRpcClientOptionsPostMessage,
  /** Registers a listener for incoming server messages. */
  onMessage: TRpcClientOptionsOnMessage,
  /** Default call timeout in ms applied to every `call()` unless overridden. */
  timeout?: number,
};

/** Factory function that returns `TRpcClientOptions` (used for lazy init). */
export type TRpcClientOptionsInit = () => TRpcClientOptions;

/**
 * Public interface implemented by `RpcClient` and `RpcClientPool`.
 *
 * @example
 * const client: IRpcClient = new RpcClient(opts);
 * const result = await client.call('add', [1, 2]);
 */
export interface IRpcClient extends IEventEmitter<any> {
  /** Returns the number of currently pending calls. */
  taskCount(): number;
  /** Destroys the client and releases resources. */
  destroy(): void;
  /**
   * Calls a remote method and returns a Promise of its result.
   * @param method - Method name exported by `RpcConnect`.
   * @param args - Arguments to pass to the method.
   * @param options - Optional timeout / abort signal / event names.
   */
  call<A extends any[] = any[], R = any>(
    method: string,
    args?: A,
    options?: TRpcClientRequestOptions
  ): Promise<R>;
  /**
   * Subscribes to a server-side event stream.
   * @param event - Event name.
   * @param args - Arguments forwarded to the server subscription handler.
   * @returns An unsubscribe function.
   */
  on(event: string, args?: any[], options?: TRpcClientRequestOptions): TRpcUnsubscribe;
  /** Returns a proxy object where every property is an async method call. */
  proxy(): Promise<Record<string, any>>;
}

// ── Connect options ────────────────────────────────────────────────────────

/** Returns all active `RpcConnect` instances in a pool. */
export type TRpcConnectOptionsGetConnections = () => IRpcConnect[];

/**
 * Context object injected as `this` into every exported server method.
 *
 * @example
 * const connect = new RpcConnect({
 *   exports: {
 *     async heavyTask(this: TRpcTaskContext, data: any) {
 *       await this.interrupt(5000); // pause for up to 5 s
 *       this.dispatch({ progress: 50 });
 *     },
 *   },
 *   ...transport,
 * });
 */
export type TRpcTaskContext = {
  /** Returns all active connections in the pool. */
  getConnections: TRpcConnectOptionsGetConnections,
  /** Abort signal — aborted when the client cancels the call. */
  signal: TRpcEventTarget,
  /** Pauses execution for up to `time` ms; resolves with `params` or rejects on abort. */
  interrupt: <A = any>(time?: number, params?: A) => Promise<A>,
  /** Sends data to the calling client. */
  dispatch: (data: any) => void,
  /** Sends data to all connected clients. */
  dispatchToAll: (data: any) => void,
};

/**
 * Options passed to `new RpcConnect(options)`.
 *
 * @example
 * new RpcConnect({
 *   exports: { add: (a, b) => a + b },
 *   postMessage: (data) => client.handleMessage(data),
 *   onMessage: (cb) => { ... return unsubscribe; },
 * });
 */
export type TRpcConnectOptions = TRpcOptions & {
  /** Sends a message to the client. */
  postMessage: TRpcConnectOptionsPostMessage,
  /** Registers a listener for incoming client messages. */
  onMessage: TRpcConnectOptionsOnMessage,
  /** Methods exposed to the client. */
  exports: TRpcConnectOptionsExports,
  /** Optional: returns all active connections (used for `dispatchToAll`). */
  getConnections?: TRpcConnectOptionsGetConnections,
};

/** Factory function that returns `TRpcConnectOptions` (used for lazy init). */
export type TRpcConnectOptionsInit = () => TRpcConnectOptions;

/** Sends a message to the client; returns an unsubscribe fn. */
export type TRpcConnectOptionsPostMessage = (requestData: TRpcConnectMessage) => TRpcUnsubscribe;

/** Callback type for incoming client messages. */
export type TRpcConnectOptionsOnMessageCallback = (responseData: MessageEvent<TRpcClientMessage>) => void;

/** Registers a listener for incoming messages; returns an unsubscribe fn. */
export type TRpcConnectOptionsOnMessage = (callback: TRpcConnectOptionsOnMessageCallback) => TRpcUnsubscribe;

/** A single exported method on the server side. Receives `TRpcTaskContext` as `this`. */
export type TRpcConnectOptionsExportFn = (this: TRpcTaskContext, ...args: any[]) => any | Promise<any>;

/** Map of method names to their implementations, passed to `RpcConnect`. */
export type TRpcConnectOptionsExports = Record<string, TRpcConnectOptionsExportFn>;

/**
 * Public interface implemented by `RpcConnect`.
 *
 * @example
 * const connect: IRpcConnect = new RpcConnect(opts);
 * connect.dispatch({ type: 'update', data });
 * connect.destroy();
 */
export interface IRpcConnect {
  /** Destroys the connection and releases resources. */
  destroy(): void;
  /** Pushes arbitrary data to the connected client (decoded value). */
  dispatch(data: any): void;
  /** Pushes already-encoded data to the connected client (wire format). */
  dispatchEncoded(encodedData: any): void;
}
