import { queueProvider } from '../src/queueProvider';
import { wait } from '../src/wait';

describe('queueProvider', () => {
  test('queues callbacks and runs them in order', async () => {
    const queue = queueProvider();
    const order: number[] = [];
    const fn1 = jest.fn(async () => { order.push(1); });
    const fn2 = jest.fn(async () => { order.push(2); });
    const q1 = queue(fn1);
    const q2 = queue(fn2);
    const p1 = q1();
    const p2 = q2();
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  test('with delay waits between invocations', async () => {
    const queue = queueProvider();
    const fn = jest.fn(async () => 42);
    const q = queue(fn, 10);
    await q();
    await q();
    const results = await Promise.all([q(), q()]);
    expect(results).toEqual([42, 42]);
  });
});
