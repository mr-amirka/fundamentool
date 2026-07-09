import {
  destroyProvider, 
} from '../src/destroyProvider';

describe('destroyProvider', () => {
  test('runs all added callbacks when called', () => {
    const calls: string[] = [];
    const destroy = destroyProvider();
    destroy.add(() => calls.push('a'), () => calls.push('b'));
    destroy();
    expect(calls.sort()).toEqual(['a', 'b']);
  });

  test('returns true on first call, false on subsequent calls', () => {
    const destroy = destroyProvider();
    expect(destroy()).toBe(true);
    expect(destroy()).toBe(false);
  });

  test('immediately calls added function after destruction', () => {
    const calls: string[] = [];
    const destroy = destroyProvider();
    destroy();
    destroy.add(() => calls.push('late'));
    expect(calls).toEqual(['late']);
  });

  test('isDestroyed() returns false before and true after', () => {
    const destroy = destroyProvider();
    expect(destroy.isDestroyed()).toBe(false);
    destroy();
    expect(destroy.isDestroyed()).toBe(true);
  });

  test('remove() prevents callback from firing', () => {
    const calls: string[] = [];
    const destroy = destroyProvider();
    const fn = () => calls.push('removed');
    destroy.add(fn);
    destroy.remove(fn);
    destroy();
    expect(calls).toEqual([]);
  });

  test('clear() empties the callback list', () => {
    const calls: string[] = [];
    const destroy = destroyProvider();
    destroy.add(() => calls.push('x'));
    destroy.clear();
    destroy();
    expect(calls).toEqual([]);
  });

  test('child() creates a child destroyer destroyed with parent', () => {
    const calls: string[] = [];
    const parent = destroyProvider();
    const child = parent.child();
    child.add(() => calls.push('child'));
    parent();
    expect(calls).toEqual(['child']);
  });

  test('accepts initial callbacks', () => {
    const calls: string[] = [];
    const destroy = destroyProvider([() => calls.push('initial')]);
    destroy();
    expect(calls).toEqual(['initial']);
  });
});
