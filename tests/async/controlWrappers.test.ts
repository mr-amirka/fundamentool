import {
  checkNoop,
  intervalAsync,
  sequence,
  sequenceDelay,
  withDelayAsync,
  withLatencyProvider,
} from '../../src/async';

describe('control wrappers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('checkNoop always returns true', () => {
    expect(checkNoop()).toBe(true);
    expect(checkNoop()).toBe(true);
  });

  test('withDelayAsync debounces calls and resolves with last result', async () => {
    const fn = jest.fn((x: number) => x * 2);
    const wrapped = withDelayAsync(fn, 100);

    const p1 = wrapped(1);
    const p2 = wrapped(2);
    const p3 = wrapped(3);

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    const result1 = await p1;
    const result2 = await p2;
    const result3 = await p3;

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
    expect(result1).toBe(6);
    expect(result2).toBe(6);
    expect(result3).toBe(6);
  });

  test('sequence executes calls one by one, preserving order', async () => {
    const calls: number[] = [];

    const seqFn = sequence(async (value: number) => {
      calls.push(value);
      return value * 2;
    });

    const p1 = seqFn(1);
    const p2 = seqFn(2);
    const p3 = seqFn(3);

    const results = await Promise.all([p1, p2, p3]);

    expect(calls).toEqual([1, 2, 3]);
    expect(results).toEqual([2, 4, 6]);
  });

  test('sequenceDelay adds delay between executions', async () => {
    const calls: number[] = [];

    const seqFn = sequenceDelay(async (value: number) => {
      calls.push(value);
      return value;
    }, 100);

    const p1 = seqFn(1);
    const p2 = seqFn(2);

    await jest.advanceTimersByTimeAsync(100);
    expect(calls).toEqual([1]);

    await jest.advanceTimersByTimeAsync(100);
    expect(calls).toEqual([1, 2]);

    await Promise.all([p1, p2]);
  });

  test('intervalAsync repeatedly calls function until canceled', async () => {
    const fn = jest.fn();

    const cancel = intervalAsync(fn, 100);

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    await Promise.resolve();  // callFn runs (1st call)
    await Promise.resolve();  // lazyNext runs (new timer set)

    jest.advanceTimersByTime(100);
    await Promise.resolve();  // callFn runs (2nd call)

    expect(fn).toHaveBeenCalledTimes(2);

    cancel();
    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('withLatencyProvider enforces minimal latency and preserves result', async () => {
    jest.useRealTimers();
    const provider = withLatencyProvider(50);

    const start = Date.now();
    const result = await provider(async () => 42);
    const end = Date.now();

    expect(result).toBe(42);
    expect(end - start).toBeGreaterThanOrEqual(45);
  });
});
