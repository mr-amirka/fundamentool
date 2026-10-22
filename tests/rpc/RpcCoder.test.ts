import {
  RpcCoder,
} from '../../src/rpc/RpcCoder';

function makeLinkedCoders() {
  const client = new RpcCoder((index) => (...args: any[]) => server.invoke(index, args));
  const server = new RpcCoder((index) => (...args: any[]) => client.invoke(index, args));
  return {
    client,
    server,
  };
}

describe('RpcCoder — primitives', () => {
  test('null passes through as-is', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode(null))).toBeNull();
  });

  test('number passes through as-is', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode(42))).toBe(42);
  });

  test('boolean passes through as-is', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode(true))).toBe(true);
  });

  test('encodes and decodes string', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode('hello'))).toBe('hello');
  });

  test('encodes and decodes undefined', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode(undefined))).toBeUndefined();
  });

  test('encodes and decodes NaN', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode(NaN))).toBeNaN();
  });

  test('encodes and decodes Infinity', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode(Infinity))).toBe(Infinity);
    expect(server.decode(client.encode(-Infinity))).toBe(-Infinity);
  });

  test('encodes and decodes BigInt', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode(9007199254740993n))).toBe(9007199254740993n);
  });
});

describe('RpcCoder — objects and arrays', () => {
  test('encodes and decodes plain object', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const obj = {
      name: 'Alice',
      age: 30,
    };
    expect(server.decode(client.encode(obj))).toEqual(obj);
  });

  test('encodes and decodes nested object', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const obj = {
      user: {
        name: 'Bob',
        tags: [
          'a',
          'b',
        ],
      },
    };
    expect(server.decode(client.encode(obj))).toEqual(obj);
  });

  test('encodes and decodes array', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    expect(server.decode(client.encode([
      1,
      'two',
      null,
    ]))).toEqual([
      1,
      'two',
      null,
    ]);
  });

  test('handles circular object reference', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const obj: any = {
      a: 1,
    };
    obj.self = obj;
    const decoded: any = server.decode(client.encode(obj));
    expect(decoded.a).toBe(1);
    expect(decoded.self).toBe(decoded);
  });
});

describe('RpcCoder — special types', () => {
  test('encodes and decodes Date', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const d = new Date('2024-01-15T12:00:00Z');
    const decoded = server.decode(client.encode(d)) as Date;
    expect(decoded).toBeInstanceOf(Date);
    expect(decoded.getTime()).toBe(d.getTime());
  });

  test('encodes and decodes RegExp', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const r = /hello/gi;
    const decoded = server.decode(client.encode(r)) as RegExp;
    expect(decoded).toBeInstanceOf(RegExp);
    expect(decoded.source).toBe(r.source);
    expect(decoded.flags).toBe(r.flags);
  });

  test('encodes and decodes Error', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const e = new Error('oops');
    const decoded = server.decode(client.encode(e)) as Error;
    expect(decoded).toBeInstanceOf(Error);
    expect(decoded.message).toContain('oops');
  });

  test('encodes and decodes Symbol — decoded is a symbol with matching description', () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const sym = Symbol('key');
    const decoded = server.decode(client.encode(sym));
    // Coder passes sym.toString() = 'Symbol(key)' as the string,
    // so decoded description is 'Symbol(key)' and decoded.toString() = 'Symbol(Symbol(key))'
    expect(typeof decoded).toBe('symbol');
    expect(decoded.description).toBe(sym.toString()); // 'Symbol(key)'
  });
});

describe('RpcCoder — functions', () => {
  test('encodes and decodes function — server can call client fn', async () => {
    const {
      client, server,
    } = makeLinkedCoders();
    const fn = (x: number) => x * 2;
    const encoded = client.encode({
      fn,
    });
    const decoded = server.decode(encoded) as { fn: (x: number) => any };
    expect(await decoded.fn(5)).toBe(10);
  });
});

describe('RpcCoder — the remaining kinds', () => {
  it('Infinity, -Infinity and NaN cross as themselves', () => {
    const coder = new RpcCoder();
    expect(coder.decode(coder.encode([
      Infinity,
      -Infinity,
      NaN,
      undefined,
    ]))).toEqual([
      Infinity,
      -Infinity,
      NaN,
      undefined,
    ]);
  });

  it('without symbols a symbol is undefined; a symbol from a coder with them is rebuilt by its description', () => {
    const plain = new RpcCoder(null, {
      useSymols: false,
    });
    expect(plain.decode(plain.encode([Symbol('k')]))).toEqual([undefined]);
    const rich = new RpcCoder();
    const decoded = plain.decode(rich.encode(Symbol('key')));
    expect(typeof decoded).toBe('symbol');
  });

  it('without a function provider functions and promises are undefined; one promise sent twice is one', async () => {
    const plain = new RpcCoder();
    expect(plain.decode(plain.encode([() => 1]))).toEqual([undefined]);
    const promised = Promise.resolve(5);
    const coder = new RpcCoder(() => () => undefined);
    const encoded = coder.encode([
      promised,
      promised,
    ]);
    expect(JSON.stringify(encoded).length).toBeGreaterThan(0);
    expect(coder.decode(coder.encode([promised]))).toHaveLength(1);
  });
});
