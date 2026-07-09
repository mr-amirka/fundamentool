import {
  Unsubscriber, 
} from '../src/Unsubscriber';

describe('Unsubscriber', () => {
  test('add returns unsubscribe that removes only added callbacks', () => {
    const u = new Unsubscriber();
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const unsub1 = u.add(fn1);
    u.add(fn2);
    unsub1();
    u.unsubscribe();
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
  });

  test('unsubscribe calls all registered unsubscribe functions', () => {
    const u = new Unsubscriber();
    const fn = jest.fn();
    u.add(fn);
    u.unsubscribe();
    expect(fn).toHaveBeenCalledTimes(1);
    u.unsubscribe();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
