import { RpcClient } from '../../src/rpc/RpcClient';
import { RpcConnect } from '../../src/rpc/RpcConnect';

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
      return () => { clientListeners.splice(clientListeners.indexOf(cb), 1); };
    },
  };

  const serverOptions = {
    postMessage: (msg: any) => {
      clientListeners.forEach((cb) => cb(msg));
      return () => {};
    },
    onMessage: (cb: Listener) => {
      serverListeners.push(cb);
      return () => { serverListeners.splice(serverListeners.indexOf(cb), 1); };
    },
  };

  return { clientOptions, serverOptions };
}

describe('RpcClient ↔ RpcConnect integration', () => {
  test('client.call resolves with server export result', async () => {
    const { clientOptions, serverOptions } = makeChannel();
    const connect = new RpcConnect({
      ...serverOptions,
      exports: {
        add: (a: number, b: number) => a + b,
      },
    });
    const client = new RpcClient(clientOptions);

    const result = await client.call('add', [3, 4]);
    expect(result).toBe(7);

    client.destroy();
    connect.destroy();
  });

  test('client.call rejects when server method throws', async () => {
    const { clientOptions, serverOptions } = makeChannel();
    const connect = new RpcConnect({
      ...serverOptions,
      exports: {
        fail: () => { throw new Error('server error'); },
      },
    });
    const client = new RpcClient(clientOptions);

    await expect(client.call('fail')).rejects.toThrow('server error');

    client.destroy();
    connect.destroy();
  });

  test('client passes function argument that server can call back', async () => {
    const { clientOptions, serverOptions } = makeChannel();
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
    const { clientOptions, serverOptions } = makeChannel();
    const connect = new RpcConnect({
      ...serverOptions,
      exports: {
        getData: () => ({ name: 'Alice', tags: ['a', 'b'] }),
      },
    });
    const client = new RpcClient(clientOptions);

    const result = await client.call('getData');
    expect(result).toEqual({ name: 'Alice', tags: ['a', 'b'] });

    client.destroy();
    connect.destroy();
  });
});
