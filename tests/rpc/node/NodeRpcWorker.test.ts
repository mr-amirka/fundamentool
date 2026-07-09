import {
  EventEmitter, 
} from 'events';
import {
  RpcClient, 
} from '../../../src/rpc/RpcClient';
import {
  RpcConnect, 
} from '../../../src/rpc/RpcConnect';
import {
  NodeRpcClientWorker, 
} from '../../../src/rpc/node/NodeRpcWorker/NodeRpcClientWorker';
import {
  NodeRpcClientWorkerPool, 
} from '../../../src/rpc/node/NodeRpcWorker/NodeRpcClientWorkerPool';
import {
  NodeRpcConnectWorker, 
} from '../../../src/rpc/node/NodeRpcWorker/NodeRpcConnectWorker';

// Variables prefixed with "mock" are accessible inside jest.mock factories despite hoisting.
// `var` (not `const`/`let`) is needed for variables assigned inside the factory,
// because jest.mock is hoisted and runs before `const`/`let` TDZ clears.
const mockWorkerInstances: any[] = [];
// eslint-disable-next-line no-var
var mockParentPort: any;

jest.mock('node:worker_threads', () => {
  const {
    EventEmitter, 
  } = require('events');

  class MockWorkerInner extends EventEmitter {
    _serverHandler: ((data: any) => void) | null = null;

    constructor(_url: string, _opts?: any) {
      super();
      mockWorkerInstances.push(this);
    }

    postMessage(data: any) {
      this._serverHandler?.(data);
    }
  }

  const parentPort = new EventEmitter();
  parentPort.postMessage = (data: any) => parentPort.emit('_out', data);
  mockParentPort = parentPort;

  return {
    Worker: MockWorkerInner,
    parentPort,
  };
});

const noop = () => {};

function attachServer(worker: any, exports: Record<string, any>): RpcConnect {
  return new RpcConnect({
    exports,
    postMessage: (data) => {
      worker.emit('message', data); return noop; 
    },
    onMessage: (cb) => {
      worker._serverHandler = cb;
      return () => {
        worker._serverHandler = null; 
      };
    },
  });
}

beforeEach(() => {
  mockWorkerInstances.length = 0;
});

// ── NodeRpcClientWorker ────────────────────────────────────────────────────────

describe('NodeRpcClientWorker', () => {
  test('call resolves with server result', async () => {
    const client = new NodeRpcClientWorker('./fake.js');
    const connect = attachServer(mockWorkerInstances[0], {
      add: (a: number, b: number) => a + b, 
    });

    expect(await client.call('add', [3, 4])).toBe(7);
    client.destroy();
    connect.destroy();
  });

  test('call rejects when server method throws', async () => {
    const client = new NodeRpcClientWorker('./fake.js');
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
    const client = new NodeRpcClientWorker('./fake.js');
    const connect = attachServer(mockWorkerInstances[0], {
      run: async (cb: (n: number) => number) => cb(10),
    });

    expect(await client.call('run', [(n: number) => n * 3])).toBe(30);
    client.destroy();
    connect.destroy();
  });

  test('onError is called when worker emits error', (done) => {
    const client = new NodeRpcClientWorker('./fake.js', {
      onError: (err: Error) => {
        expect(err.message).toBe('oops');
        client.destroy();
        done();
      },
    });
    mockWorkerInstances[0].emit('error', new Error('oops'));
  });
});

// ── NodeRpcClientWorkerPool ───────────────────────────────────────────────────

describe('NodeRpcClientWorkerPool', () => {
  test('distributes calls across workers', async () => {
    const pool = new NodeRpcClientWorkerPool('./fake.js', {
      maxWorkers: 2, 
    });

    // Force pre-creation of all workers so we can attach servers before calling
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
    const pool = new NodeRpcClientWorkerPool('./fake.js', {
      maxWorkers: 3, 
    });
    pool.getWorkers(3);
    expect(mockWorkerInstances.length).toBe(3);
    pool.destroy();
  });
});

// ── NodeRpcConnectWorker ──────────────────────────────────────────────────────

describe('NodeRpcConnectWorker', () => {
  test('run() returns RpcConnect wired to parentPort', async () => {
    const connect = await NodeRpcConnectWorker.run({
      greet: (name: string) => `hello ${name}`,
    });

    const client = new RpcClient({
      postMessage: (data) => {
        mockParentPort.emit('message', data); return noop; 
      },
      onMessage: (cb) => {
        mockParentPort.on('_out', cb);
        return () => mockParentPort.off('_out', cb);
      },
    });

    expect(await client.call('greet', ['world'])).toBe('hello world');

    client.destroy();
    connect.destroy();
  });
});
