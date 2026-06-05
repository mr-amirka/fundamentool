import { RpcFnCoder } from '../../../src/rpc/RpcCoder/RpcFnCoder';

describe('RpcFnCoder', () => {
  function makeProvider() {
    const calls: number[] = [];
    const provider = (index: number) => async (...args: any[]) => {
      calls.push(index);
      return `external:${index}`;
    };
    return { provider, calls };
  }

  test('encode returns [0, index] for new internal fn', () => {
    const { provider } = makeProvider();
    const coder = new RpcFnCoder(provider);
    const fn = () => 42;
    const encoded = coder.encode(fn);
    expect(encoded).toEqual([0, 0]);
  });

  test('encode returns same index for same fn', () => {
    const { provider } = makeProvider();
    const coder = new RpcFnCoder(provider);
    const fn = () => 42;
    expect(coder.encode(fn)).toEqual([0, 0]);
    expect(coder.encode(fn)).toEqual([0, 0]);
  });

  test('different fns get different indexes', () => {
    const { provider } = makeProvider();
    const coder = new RpcFnCoder(provider);
    const fn1 = () => 1;
    const fn2 = () => 2;
    const e1 = coder.encode(fn1)!;
    const e2 = coder.encode(fn2)!;
    expect(e1[1]).not.toBe(e2[1]);
  });

  test('decode [0, index] creates external proxy via provider (other side encoded as internal)', async () => {
    // [0, i] = "the OTHER side's internal fn at index i" → create proxy
    const { provider } = makeProvider();
    const coder = new RpcFnCoder(provider);
    const externalFn = coder.decode([0, 3]);
    expect(typeof externalFn).toBe('function');
    expect(await externalFn!()).toBe('external:3');
  });

  test('decode [1, index] returns original internal fn (round-trip)', () => {
    // [1, i] = "this fn was originally mine (internals[i])" → return it
    const { provider } = makeProvider();
    const coder = new RpcFnCoder(provider);
    const fn = () => 99;
    coder.encode(fn); // stored as internals[0]
    expect(coder.decode([1, 0])).toBe(fn);
  });

  test('invoke calls internal fn with args', () => {
    const { provider } = makeProvider();
    const coder = new RpcFnCoder(provider);
    const fn = (a: number, b: number) => a + b;
    coder.encode(fn);
    expect(coder.invoke(0, [3, 4])).toBe(7);
  });

  test('addInternal adds fn and returns its index', () => {
    const { provider } = makeProvider();
    const coder = new RpcFnCoder(provider);
    const fn = () => 'hi';
    const index = coder.addInternal(fn);
    expect(index).toBe(0);
    expect(coder.invoke(index, [])).toBe('hi');
  });
});
