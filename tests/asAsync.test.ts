import { asAsync } from '../src/asAsync';

describe('asAsync', () => {
  test('resolves with sync function result', async () => {
    expect(await asAsync(() => 42)).toBe(42);
  });

  test('resolves with string result', async () => {
    expect(await asAsync(() => 'hello')).toBe('hello');
  });

  test('resolves with promise returned by function', async () => {
    expect(await asAsync(() => Promise.resolve('ok'))).toBe('ok');
  });

  test('returns a Promise', () => {
    expect(asAsync(() => 1)).toBeInstanceOf(Promise);
  });
});
