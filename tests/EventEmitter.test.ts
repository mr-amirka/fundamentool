import {
  EventEmitter,
} from '../src/EventEmitter';

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

  test('once doesn\'t skip the listener after it; one added during a call hears the next', () => {
    const em = new TestEmitter();
    const heard: string[] = [];
    em.once((value) => heard.push(`once ${value}`));
    em.subscribe((value) => {
      heard.push(`other ${value}`);
      if (value === 1) {
        em.subscribe((next) => heard.push(`late ${next}`));
      }
    });
    em.fire(1);
    em.fire(2);
    expect(heard).toEqual([
      'once 1',
      'other 1',
      'other 2',
      'late 2',
    ]);
  });

  test('an unsubscribe twice, or after destroy, does nothing; a subscribe after destroy hears nothing', () => {
    const em = new TestEmitter();
    const fn = jest.fn();
    const off = em.subscribe(fn);
    const kept = em.subscribe(fn);
    off();
    off();
    em.fire(1);
    expect(fn).toHaveBeenCalledTimes(1);
    em.destroy();
    kept();
    em.subscribe(fn)();
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

describe('EventEmitter — listeners given at the start, a listener that throws', () => {
  it('the list given is copied; a throwing listener is logged and the next ones still hear', () => {
    const heard: number[] = [];
    const given = [
      (value: number) => {
        heard.push(value);
      },
    ];
    const emitter = new TestEmitter(given);
    given.length = 0;
    const failure = new Error('listener');
    emitter.subscribe(() => {
      throw failure;
    });
    emitter.subscribe((value) => {
      heard.push(value * 10);
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      emitter.fire(1);
      expect(error).toHaveBeenCalledWith('EventEmitter:listener:error', failure);
    } finally {
      error.mockRestore();
    }
    expect(heard).toEqual([
      1,
      10,
    ]);
  });
});
