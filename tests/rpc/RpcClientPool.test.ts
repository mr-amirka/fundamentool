import {
  RpcClient, 
} from '../../src/rpc/RpcClient';
import {
  RpcConnect, 
} from '../../src/rpc/RpcConnect';
import {
  RpcClientPool, 
} from '../../src/rpc/RpcClientPool';

function makeChannel() {
  type Listener = (msg: any) => void;
  const clientListeners: Listener[] = [];
  const serverListeners: Listener[] = [];

  const clientOptions = {
    postMessage: (msg: any) => {
      serverListeners[0]?.(msg);
      return () => {};
    },
    onMessage: (cb: Listener) => {
      clientListeners.push(cb);
      return () => {
        clientListeners.splice(clientListeners.indexOf(cb), 1); 
      };
    },
  };

  const serverOptions = {
    postMessage: (msg: any) => {
      clientListeners.forEach((cb) => cb(msg));
      return () => {};
    },
    onMessage: (cb: Listener) => {
      serverListeners.push(cb);
      return () => {
        serverListeners.splice(serverListeners.indexOf(cb), 1); 
      };
    },
  };

  return {
    clientOptions,
    serverOptions, 
  };
}

function makeServer(exports: Record<string, any>) {
  const channels = Array.from({
    length: 4, 
  }, () => makeChannel());
  const connects = channels.map(({
    serverOptions, 
  }) => new RpcConnect({
    ...serverOptions,
    exports, 
  }));
  const clients = channels.map(({
    clientOptions, 
  }) => new RpcClient(clientOptions));

  const pool = new RpcClientPool({
    maxWorkers: clients.length,
    workerProvider: (() => {
      let i = 0;
      return () => clients[i++];
    })(),
  });

  return {
    pool,
    cleanup: () => {
      clients.forEach((c) => c.destroy());
      connects.forEach((c) => c.destroy());
      pool.destroy();
    },
  };
}

describe('RpcClientPool', () => {
  test('call routes to a worker and resolves', async () => {
    const {
      pool, cleanup, 
    } = makeServer({
      add: (a: number, b: number) => a + b, 
    });
    const result = await pool.call('add', [3, 4]);
    expect(result).toBe(7);
    cleanup();
  });

  test('taskCount returns sum across all workers', () => {
    const pool = new RpcClientPool({
      maxWorkers: 1,
      workerProvider: () => ({
        call: () => new Promise(() => {}),
        on: () => () => {},
        proxy: () => new Promise(() => {}),
        taskCount: () => 2,
        destroy: () => {},
      } as any),
    });
    pool.call('x');
    expect(pool.taskCount()).toBe(2);
    pool.destroy();
  });

  test('getWorkers returns array of requested size cycling through maxWorkers', () => {
    const created: number[] = [];
    const pool = new RpcClientPool({
      maxWorkers: 2,
      workerProvider: (() => {
        let i = 0;
        return () => {
          created.push(i++);
          return {
            call: () => Promise.resolve(),
            on: () => () => {},
            proxy: () => Promise.resolve(),
            taskCount: () => 0,
            destroy: () => {}, 
          } as any;
        };
      })(),
    });
    const workers = pool.getWorkers(4);
    expect(workers.length).toBe(4);
    // indices 0,1,0,1 → same 2 worker instances reused
    expect(workers[0]).toBe(workers[2]);
    expect(workers[1]).toBe(workers[3]);
    pool.destroy();
  });

  test('getWorker picks worker with fewest tasks', () => {
    const taskCounts = [
      3,
      1,
      2,
    ];
    let provideIndex = 0;
    const pool = new RpcClientPool({
      maxWorkers: 3,
      workerProvider: () => {
        const idx = provideIndex++;
        return {
          call: () => Promise.resolve(),
          on: () => () => {},
          proxy: () => Promise.resolve(),
          taskCount: () => taskCounts[idx],
          destroy: () => {}, 
        } as any;
      },
    });
    // Force creation of all 3 workers
    pool.getWorkers(3);
    const chosen = pool.getWorker();
    expect(chosen.taskCount()).toBe(1);
    pool.destroy();
  });

  test('getWorker creates new worker if slot is free (taskCount < 1)', () => {
    let callCount = 0;
    const pool = new RpcClientPool({
      maxWorkers: 2,
      workerProvider: () => {
        callCount++;
        return {
          call: () => Promise.resolve(),
          on: () => () => {},
          proxy: () => Promise.resolve(),
          taskCount: () => 0,
          destroy: () => {}, 
        } as any;
      },
    });
    pool.getWorker(); // creates worker 0, taskCount=0 → returns immediately
    expect(callCount).toBe(1);
    pool.destroy();
  });

  test('destroy calls destroy on all workers', () => {
    const destroyed: number[] = [];
    let idx = 0;
    const pool = new RpcClientPool({
      maxWorkers: 3,
      workerProvider: () => {
        const i = idx++;
        return {
          call: () => Promise.resolve(),
          on: () => () => {},
          proxy: () => Promise.resolve(),
          taskCount: () => 1,
          destroy: () => destroyed.push(i), 
        } as any;
      },
    });
    pool.getWorkers(3);
    pool.destroy();
    expect(destroyed.sort()).toEqual([
      0,
      1,
      2,
    ]);
  });

  test('multiple calls resolve correctly via pool', async () => {
    const {
      pool, cleanup, 
    } = makeServer({
      double: (x: number) => x * 2, 
    });
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
    cleanup();
  });
});
