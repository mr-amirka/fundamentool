import { loopAsync } from '../../src/async/loopAsync';

describe('loopAsync', () => {
  test('runs loop while checkFn returns true', async () => {
    let i = 0;
    const sequence: number[] = [];

    await loopAsync(
      () => i < 5,
      () => {
        sequence.push(i);
        i += 1;
      },
    );

    expect(sequence).toEqual([0, 1, 2, 3, 4]);
  });

  test('stops immediately when checkFn is initially false', async () => {
    let called = false;

    await loopAsync(
      () => false,
      () => {
        called = true;
      },
    );

    expect(called).toBe(false);
  });

  test('rejects when statementFn throws', async () => {
    const error = new Error('boom');

    await expect(
      loopAsync(
        () => true,
        () => {
          throw error;
        },
      ),
    ).rejects.toBe(error);
  });
});

