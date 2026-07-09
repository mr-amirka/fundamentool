import {
  bindMethods, 
} from '../src/bindMethods';

describe('bindMethods', () => {
  test('binds methods to the object', () => {
    class Counter {
      value = 0;
      increment() {
        this.value++; 
      }
      decrement() {
        this.value--; 
      }
    }

    const counter = new Counter();
    bindMethods(counter, ['increment', 'decrement']);

    const {
      increment, decrement, 
    } = counter;
    increment();
    increment();
    decrement();
    expect(counter.value).toBe(1);
  });

  test('returns the same object', () => {
    const obj = {
      fn() {}, 
    };
    expect(bindMethods(obj, ['fn'])).toBe(obj);
  });

  test('bound method uses object context when called standalone', () => {
    const obj = {
      x: 42,
      getX() {
        return (this as any).x; 
      },
    };
    bindMethods(obj, ['getX']);
    const {
      getX, 
    } = obj;
    expect(getX()).toBe(42);
  });
});
