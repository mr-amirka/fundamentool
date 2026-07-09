import {
  subscribe, 
} from '../src/subscribe';

describe('subscribe', () => {
  test('pushes listeners to collection and unsubscribe removes them', () => {
    const collection: (() => void)[] = [];
    const listeners = [jest.fn(), jest.fn()];
    const unsub = subscribe(collection, listeners);
    expect(collection).toHaveLength(2);
    unsub();
    expect(collection).toHaveLength(0);
  });

  test('handles null collection or listeners', () => {
    const unsub1 = subscribe(null, [jest.fn()]);
    unsub1();
    const arr: (() => void)[] = [];
    const unsub2 = subscribe(arr, null);
    unsub2();
    expect(arr).toHaveLength(0);
  });
});
