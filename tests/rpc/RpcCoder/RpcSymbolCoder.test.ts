import { RpcSymbolCoder } from '../../../src/rpc/RpcCoder/RpcSymbolCoder';

describe('RpcSymbolCoder', () => {
  test('encodes internal symbol as [0, index, stringIndex]', () => {
    const coder = new RpcSymbolCoder();
    const sym = Symbol('test');
    const encoded = coder.encode(sym, 5);
    expect(encoded[0]).toBe(0);
    expect(encoded[2]).toBe(5);
  });

  test('same internal symbol encodes to the same index', () => {
    const coder = new RpcSymbolCoder();
    const sym = Symbol('a');
    const e1 = coder.encode(sym, 0);
    const e2 = coder.encode(sym, 0);
    expect(e1[1]).toBe(e2[1]);
  });

  test('different symbols get different indexes', () => {
    const coder = new RpcSymbolCoder();
    const s1 = Symbol('a');
    const s2 = Symbol('b');
    const e1 = coder.encode(s1, 0);
    const e2 = coder.encode(s2, 1);
    expect(e1[1]).not.toBe(e2[1]);
  });

  test('decode flag=0: creates a new external symbol with given string description', () => {
    const coder = new RpcSymbolCoder();
    const sym = Symbol('hello');
    const encoded = coder.encode(sym, 0);
    // flag=0 → receiver creates Symbol(strings[stringIndex]), not the original instance
    const decoded = coder.decode(encoded, ['hello']);
    expect(typeof decoded).toBe('symbol');
    expect(decoded.toString()).toBe('Symbol(hello)');
    expect(decoded).not.toBe(sym);
  });

  test('decode flag=0: same encoded value always returns the same external symbol', () => {
    const coder = new RpcSymbolCoder();
    const sym = Symbol('key');
    const encoded = coder.encode(sym, 0);
    const d1 = coder.decode(encoded, ['key']);
    const d2 = coder.decode(encoded, ['key']);
    expect(d1).toBe(d2);
  });

  test('decode flag=1: returns internal symbol by index (round-trip from other side)', () => {
    // Simulate: client encodes symA (stored as internals[0]),
    // server decodes it (creates externals[0]),
    // server re-encodes it back → [1, 0, stringIndex],
    // client decodes [1, 0, ...] → returns client.internals[0] === symA
    const clientCoder = new RpcSymbolCoder();
    const symA = Symbol('ping');
    const encoded = clientCoder.encode(symA, 0); // [0, 0, 0]

    const serverCoder = new RpcSymbolCoder();
    const serverSide = serverCoder.decode(encoded, ['ping']); // externals[0]
    const reEncoded = serverCoder.encode(serverSide, 0); // [1, 0, 0]

    const roundTripped = clientCoder.decode(reEncoded, ['ping']);
    expect(roundTripped).toBe(symA);
  });
});
