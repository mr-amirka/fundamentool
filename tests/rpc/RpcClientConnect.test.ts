import {
  RpcClient,
} from '../../src/rpc/RpcClient';
import {
  RpcConnect,
} from '../../src/rpc/RpcConnect';
import {
  makeChannel,
} from './_channel';

describe('RpcClient ↔ RpcConnect integration', () => {
  test('client.call resolves with server export result', async () => {
    const {
      clientOptions, serverOptions,
    } = makeChannel();
    const connect = new RpcConnect({
      ...serverOptions,
      exports: {
        add: (a: number, b: number) => a + b,
      },
    });
    const client = new RpcClient(clientOptions);

    const result = await client.call('add', [
      3,
      4,
    ]);
    expect(result).toBe(7);

    client.destroy();
    connect.destroy();
  });

  test('client.call rejects when server method throws', async () => {
    const {
      clientOptions, serverOptions,
    } = makeChannel();
    const connect = new RpcConnect({
      ...serverOptions,
      exports: {
        fail: () => {
          throw new Error('server error');
        },
      },
    });
    const client = new RpcClient(clientOptions);

    await expect(client.call('fail')).rejects.toThrow('server error');

    client.destroy();
    connect.destroy();
  });

  test('client passes function argument that server can call back', async () => {
    const {
      clientOptions, serverOptions,
    } = makeChannel();
    const connect = new RpcConnect({
      ...serverOptions,
      exports: {
        runCallback: async (cb: (v: number) => number) => cb(42),
      },
    });
    const client = new RpcClient(clientOptions);

    const result = await client.call('runCallback', [(v: number) => v * 2]);
    expect(result).toBe(84);

    client.destroy();
    connect.destroy();
  });

  test('server can return complex object', async () => {
    const {
      clientOptions, serverOptions,
    } = makeChannel();
    const connect = new RpcConnect({
      ...serverOptions,
      exports: {
        getData: () => ({
          name: 'Alice',
          tags: [
            'a',
            'b',
          ],
        }),
      },
    });
    const client = new RpcClient(clientOptions);

    const result = await client.call('getData');
    expect(result).toEqual({
      name: 'Alice',
      tags: [
        'a',
        'b',
      ],
    });

    client.destroy();
    connect.destroy();
  });

  describe('settled (fundamentool D-109)', () => {
    /** A server whose `slow` answers only when the test lets it — a native call no signal can stop. */
    const slowServer = () => {
      const {
        clientOptions, serverOptions,
      } = makeChannel();
      let finish: () => void = () => {};
      const connect = new RpcConnect({
        ...serverOptions,
        exports: {
          slow: () => new Promise<string>((resolve) => {
            finish = () => resolve('done');
          }),
        },
      });
      return {
        client: new RpcClient(clientOptions),
        connect,
        finish: () => finish(),
      };
    };

    test('no call: at once', async () => {
      const {
        client, connect,
      } = slowServer();
      await expect(client.settled()).resolves.toBeUndefined();
      client.destroy();
      connect.destroy();
    });

    test('a call given up here rejects at once; settled waits until the other end answers it', async () => {
      const {
        client, connect, finish,
      } = slowServer();
      const controller = new AbortController();
      const call = client.call(
        'slow', [], {
          signal: controller.signal,
        },
      );
      controller.abort();
      await expect(call).rejects.toThrow('aborted');
      expect(client.taskCount()).toBe(1);
      let settled = false;
      const waiting = client.settled().then(() => {
        settled = true;
      });
      await Promise.resolve();
      expect(settled).toBe(false);
      finish();
      await waiting;
      expect(client.taskCount()).toBe(0);
      client.destroy();
      connect.destroy();
    });

    test('destroy loses the calls waiting: settled resolves', async () => {
      const {
        client, connect,
      } = slowServer();
      const call = client.call('slow').catch((error: Error) => error.message);
      const waiting = client.settled();
      client.destroy(new Error('gone'));
      await waiting;
      expect(await call).toBe('gone');
      connect.destroy();
    });
  });
});
