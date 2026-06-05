import { EventEmitter } from '../src/EventEmitter';

class TestEmitter extends EventEmitter<number> {
  public fire(value: number) {
    this.emit(value);
  }
}

describe('EventEmitter', () => {
  test('subscribe adds listener and unsubscribe removes it', () => {
    const em = new TestEmitter();
    const fn = jest.fn();
    const unsub = em.subscribe(fn);
    em.fire(1);
    expect(fn).toHaveBeenCalledWith(1);
    unsub();
    em.fire(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('once calls listener once then unsubscribes', () => {
    const em = new TestEmitter();
    const fn = jest.fn();
    em.once(fn);
    em.fire(1);
    em.fire(2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  test('clear removes all listeners', () => {
    const em = new TestEmitter();
    const fn = jest.fn();
    em.subscribe(fn);
    em.clear();
    em.fire(1);
    expect(fn).not.toHaveBeenCalled();
  });

  test('destroy nulls listeners', () => {
    const em = new TestEmitter();
    const fn = jest.fn();
    em.subscribe(fn);
    em.destroy();
    em.fire(1);
    expect(fn).not.toHaveBeenCalled();
  });
});
