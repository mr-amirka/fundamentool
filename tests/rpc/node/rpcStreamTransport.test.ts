/**
 * RPC over a Node stream (fundamentool D-103): calls, a callback argument and errors across a real socket; the head read
 * first; a line that is no JSON skipped; a closed client's waiting calls rejected; an error's class kept.
 */
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import {
  RpcClient,
} from '../../../src/rpc/RpcClient';
import {
  RpcConnect,
} from '../../../src/rpc/RpcConnect';
import {
  rpcStreamTransport,
} from '../../../src/rpc/node';

let dir: string;
let server: net.Server;
const opened: net.Socket[] = [];

/** A server whose every connection is served by `exports`; the client's socket. */
async function pair(exports: Record<string, (...args: any[]) => any>): Promise<net.Socket> {
  const socket = path.join(dir, 's.sock');
  server = net.createServer((connection) => {
    opened.push(connection);
    const connect = new RpcConnect({
      exports,
      ...rpcStreamTransport(connection),
    });
    connection.on('close', () => {
      connect.destroy();
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(socket, resolve);
  });
  const client = net.connect(socket);
  opened.push(client);
  await new Promise((resolve) => {
    client.once('connect', resolve);
  });
  return client;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpc-'));
});

afterEach(async () => {
  for (const socket of opened.splice(0)) {
    socket.destroy();
  }
  await new Promise((resolve) => {
    server?.close(resolve);
  });
  fs.rmSync(dir, {
    recursive: true,
    force: true,
  });
});

describe('rpcStreamTransport', () => {
  it('a call and its callback argument cross a socket; a server error comes back as its own class', async () => {
    const socket = await pair({
      count: async (to: number, onStep: (step: number) => void) => {
        for (let step = 1; step <= to; step++) {
          await onStep(step);
        }
        return 'ё'.repeat(to);
      },
      wrong: () => {
        throw new TypeError('expects a number');
      },
      thrown: () => {
        throw 'a string';
      },
    });
    const client = new RpcClient(rpcStreamTransport(socket));
    const steps: number[] = [];
    expect(await client.call('count', [
      3,
      (step: number) => {
        steps.push(step);
      },
    ])).toBe('ëëë'.replace(/ë/g, 'ё'));
    expect(steps).toEqual([
      1,
      2,
      3,
    ]);
    const failure = await client.call('wrong').catch((caught: unknown) => caught);
    expect(failure).toBeInstanceOf(TypeError);
    expect((failure as Error).message).toBe('wrong: expects a number');
    const thrown = await client.call('thrown').catch((caught: unknown) => caught);
    expect(thrown).toMatchObject({
      name: 'Error',
      message: 'thrown: a string',
    });
    client.destroy();
  });

  it('the head is read first; a line that is no JSON is skipped; a character split between chunks joins', async () => {
    const got: unknown[] = [];
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const socket = await pair({});
    const transport = rpcStreamTransport(socket, {
      head: Buffer.from('{"a":1}\nnot json\n'),
    });
    const stop = transport.onMessage((message) => {
      got.push(message);
    });
    transport.onMessage(() => undefined);
    const far = opened[opened.length - 1] === socket ? opened[0] : opened[opened.length - 1];
    const text = Buffer.from('{"b":"ё"}\n');
    far.write(text.subarray(0, 8));
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    far.write(text.subarray(8));
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(got).toEqual([
      {
        a: 1,
      },
      {
        b: 'ё',
      },
    ]);
    expect(warn).toHaveBeenCalledWith('[fundamentool] rpcStreamTransport: a line that is no JSON, skipped:', 'not json');
    stop();
    far.write('{"c":3}\n');
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(got).toHaveLength(2);
    warn.mockRestore();
  });

  it('a string head, and a stream that gives strings', async () => {
    const got: unknown[] = [];
    const socket = await pair({});
    socket.setEncoding('utf8');
    rpcStreamTransport(socket, {
      head: '{"a":1}\n',
    }).onMessage((message) => {
      got.push(message);
    });
    opened[opened.length - 1].write('{"b":2}\n');
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(got).toEqual([
      {
        a: 1,
      },
      {
        b: 2,
      },
    ]);
  });

  it('a closed stream: nothing written; the client destroyed — its waiting calls reject with the reason', async () => {
    const socket = await pair({
      never: () => new Promise(() => undefined),
    });
    const client = new RpcClient(rpcStreamTransport(socket));
    const waiting = client.call('never');
    const other = client.call('never');
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    socket.on('close', () => {
      client.destroy(new Error('the server went away'));
    });
    opened[opened.length - 1].destroy();
    await expect(waiting).rejects.toThrow('the server went away');
    await expect(other).rejects.toThrow('the server went away');
    const write = jest.spyOn(socket, 'write');
    rpcStreamTransport(socket).postMessage({
      late: true,
    })();
    expect(write).not.toHaveBeenCalled();
  });

  it('destroyed with no reason: the waiting calls reject with "Client: destroyed"', async () => {
    const socket = await pair({
      never: () => new Promise(() => undefined),
    });
    const client = new RpcClient(rpcStreamTransport(socket));
    const waiting = client.call('never');
    client.destroy();
    await expect(waiting).rejects.toThrow('Client: destroyed');
  });

  it.each([
    [
      'an unknown option',
      {
        hed: '',
      },
      'unknown option "hed". Did you mean "head"?',
    ],
    [
      'a head of another type',
      {
        head: 1,
      },
      '"head" expects a Buffer or a string, got number',
    ],
  ])('wrong options — %s', (
    _name, options, message,
  ) => {
    expect(() => rpcStreamTransport(new net.Socket(), options as never)).toThrow(message);
  });
});
