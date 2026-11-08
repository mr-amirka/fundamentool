/**
 * The watchers' list (fundamentool D-112): replaced on subscribing, never changed in place — a call copies nothing.
 */
import {
  notifyAll,
  withWatcher,
  withoutWatcher,
} from '../src/watchers';

describe('watchers', () => {
  it('a watcher once; the list a call started with is the one it reads', () => {
    const heard: string[] = [];
    const a = (value: number) => heard.push(`a ${value}`);
    const b = (value: number) => heard.push(`b ${value}`);
    const one = withWatcher([], a);
    expect(withWatcher(one, a)).toBe(one);
    const two = withWatcher(one, b);
    expect(one).toEqual([a]);
    expect(withoutWatcher(two, (value: number) => value)).toBe(two);
    notifyAll(two, 1);
    notifyAll(withoutWatcher(two, a), 2);
    expect(heard).toEqual([
      'a 1',
      'b 1',
      'b 2',
    ]);
  });
});
