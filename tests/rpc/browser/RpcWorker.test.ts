import {
  RpcClient, 
} from '../../../src/rpc/RpcClient';
import {
  RpcConnect, 
} from '../../../src/rpc/RpcConnect';
import {
  RpcClientWorker, 
} from '../../../src/rpc/browser/RpcWorker/RpcClientWorker';
import {
  RpcClientWorkerPool, 
} from '../../../src/rpc/browser/RpcWorker/RpcClientWorkerPool';
import {
  RpcConnectWorker, 
} from '../../../src/rpc/browser/RpcWorker/RpcConnectWorker';

// Variables prefixed with "mock" are accessible inside jest.mock factories despite hoisting.
// `var` (not `const`/`let`) is needed for variables assigned inside the factory,
// because jest.mock is hoisted and runs before `const`/`let` TDZ clears.
const WORKER_URL = 'http://localhost/worker.js';
const noop = () => {};

const mockWorkerInstances: MockWorker[] = [];

// MockWorker implements EventTarget interface required by attachEvent / onRpcMessageProvider.
// postMessage routes client → server; _emitMessage routes server → client.
class MockWorker {
  private _handlers = new Map<string, Array<(e: any) => void>>();
  _serverHandler: ((data: any) => void) | null = null;

  constructor(_url: URL | string, _opts?: any) {
    mockWorkerInstances.push(this);
  }

  addEventListener(event: string, handler: (e: any) => void) {
    const list = this._handlers.get(event) || [];
    list.push(handler);
    this._handlers.set(event, list);
  }

  removeEventListener(event: string, handler: (e: any) => void) {
    const list = this._handlers.get(event);
    if (list) {
      this._handlers.set(event, list.filter((h) => h !== handler));
    }
  }

  postMessage(data: any) {
    this._serverHandler?.(data);
  }

  _emitMessage(data: any) {
    const handlers = this._handlers.get('message') || [];
    const event = {
      data, 
    } as MessageEvent;
    handlers.forEach((h) => h(event));
  }
}

function attachServer(worker: MockWorker, exports: Record<string, any>): RpcConnect {
  return new RpcConnect({
    exports,
    postMessage: (data) => {
      worker._emitMessage(data); return noop; 
    },
    onMessage: (cb) => {
      worker._serverHandler = cb;
      return () => {
        worker._serverHandler = null; 
      };
    },
  });
}

const originalWorker = (global as any).Worker;

beforeAll(() => {
  (global as any).Worker = MockWorker;
});

afterAll(() => {
  (global as any).Worker = originalWorker;
});

beforeEach(() => {
  mockWorkerInstances.length = 0;
});

// ── RpcClientWorker ────────────────────────────────────────────────────────────

describe('RpcClientWorker', () => {
  test('call resolves with server result', async () => {
    const client = new RpcClientWorker(WORKER_URL);
    const connect = attachServer(mockWorkerInstances[0], {
      add: (a: number, b: number) => a + b, 
    });

    expect(await client.call('add', [3, 4])).toBe(7);
    client.destroy();
    connect.destroy();
  });

  test('call rejects when server method throws', async () => {
    const client = new RpcClientWorker(WORKER_URL);
    const connect = attachServer(mockWorkerInstances[0], {
      fail: () => {
        throw new Error('boom'); 
      },
    });

    await expect(client.call('fail')).rejects.toThrow('boom');
    client.destroy();
    connect.destroy();
  });

  test('passes function argument for server callback', async () => {
    const client = new RpcClientWorker(WORKER_URL);
    const connect = attachServer(mockWorkerInstances[0], {
      run: async (cb: (n: number) => number) => cb(10),
    });

    expect(await client.call('run', [(n: number) => n * 3])).toBe(30);
    client.destroy();
    connect.destroy();
  });
});

// ── RpcClientWorkerPool ────────────────────────────────────────────────────────

describe('RpcClientWorkerPool', () => {
  test('distributes calls across workers', async () => {
    const pool = new RpcClientWorkerPool(WORKER_URL, {
      maxWorkers: 2, 
    });
    pool.getWorkers(2);

    const connects = mockWorkerInstances.map((w) =>
      attachServer(w, {
        double: (x: number) => x * 2, 
      }));

    const results = await Promise.all([
      pool.call('double', [1]),
      pool.call('double', [2]),
      pool.call('double', [3]),
    ]);
    expect(results).toEqual([
      2,
      4,
      6,
    ]);

    pool.destroy();
    connects.forEach((c) => c.destroy());
  });

  test('creates up to maxWorkers workers on demand', () => {
    const pool = new RpcClientWorkerPool(WORKER_URL, {
      maxWorkers: 3, 
    });
    pool.getWorkers(3);
    expect(mockWorkerInstances.length).toBe(3);
    pool.destroy();
  });
});

// ── RpcConnectWorker ───────────────────────────────────────────────────────────

describe('RpcConnectWorker', () => {
  beforeEach(() => {
    // Reset SyntheticWorker index so each test starts as the "first" worker.
    // Without this, the second call to run() would get index 2 (> 1) and
    // take the SyntheticWorker code path instead of the intended one.
    (global as any)['SyntheticWorkerLastIndex'] = 0;
  });

  test('run() — ordinary worker path: RpcConnect wired to globalThis', async () => {
    let connectReceiver: ((data: any) => void) | null = null;
    let clientReceiver: ((data: any) => void) | null = null;

    const origPostMessage = (global as any).postMessage;
    const origAddEL = (global as any).addEventListener;
    const origRemoveEL = (global as any).removeEventListener;

    // Simulate ordinary Worker global scope: postMessage + addEventListener available
    (global as any).postMessage = (data: any) => {
      clientReceiver?.(data); return noop; 
    };
    (global as any).addEventListener = (event: string, handler: any) => {
      if (event === 'message') {
        connectReceiver = (data: any) => handler({
          data, 
        } as MessageEvent);
      }
    };
    (global as any).removeEventListener = noop;

    try {
      await RpcConnectWorker.run({
        greet: (name: string) => `hello ${name}`, 
      });

      const client = new RpcClient({
        postMessage: (data) => {
          connectReceiver?.(data); return noop; 
        },
        onMessage: (cb) => {
          clientReceiver = cb;
          return () => {
            clientReceiver = null; 
          };
        },
      });

      expect(await client.call('greet', ['world'])).toBe('hello world');
      client.destroy();
    } finally {
      (global as any).postMessage = origPostMessage;
      (global as any).addEventListener = origAddEL;
      (global as any).removeEventListener = origRemoveEL;
    }
  });

  test('run() — SharedWorker path: handles connect event', async () => {
    // In Node, globalThis.postMessage is undefined → RpcConnectWorker enters SharedWorker path
    let connectEventHandler: ((e: any) => void) | null = null;

    const origAddEL = (global as any).addEventListener;
    const origRemoveEL = (global as any).removeEventListener;

    (global as any).addEventListener = (event: string, handler: any) => {
      if (event === 'connect') {
        connectEventHandler = handler;
      }
    };
    (global as any).removeEventListener = noop;

    try {
      await RpcConnectWorker.run({
        add: (a: number, b: number) => a + b, 
      });

      let portMessageHandler: ((data: any) => void) | null = null;
      let portClientReceiver: ((data: any) => void) | null = null;

      const mockPort: any = {
        postMessage: (data: any) => portClientReceiver?.(data),
        addEventListener: (event: string, handler: any) => {
          if (event === 'message') {
            portMessageHandler = (data: any) => handler({
              data, 
            } as MessageEvent);
          }
        },
        removeEventListener: noop,
        start: noop,
      };

      // Simulate browser dispatching the 'connect' event for a new SharedWorker connection
      connectEventHandler?.({
        source: mockPort, 
      } as any);

      const client = new RpcClient({
        postMessage: (data) => {
          portMessageHandler?.(data); return noop; 
        },
        onMessage: (cb) => {
          portClientReceiver = cb;
          return () => {
            portClientReceiver = null; 
          };
        },
      });

      expect(await client.call('add', [5, 3])).toBe(8);
      client.destroy();
    } finally {
      (global as any).addEventListener = origAddEL;
      (global as any).removeEventListener = origRemoveEL;
    }
  });
});
