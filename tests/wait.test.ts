import { wait } from '../src/wait';

describe('wait', () => {
  test('resolves after the specified delay', async () => {
    const start = Date.now();
    await wait(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(45);
  }, 1000);

  test('resolves immediately with delay 0', async () => {
    await expect(wait(0)).resolves.toBeUndefined();
  });

  test('resolves with the provided value', async () => {
    const result = await wait(0, 'done');
    expect(result).toBe('done');
  });

  test('resolves with undefined when no value provided', async () => {
    const result = await wait(0);
    expect(result).toBeUndefined();
  });
});
