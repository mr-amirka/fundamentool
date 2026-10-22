import {
  readyProvider,
} from '../src/readyProvider';

function makeWindow(readyState: string = 'loading') {
  const listeners: Record<string, (() => void)[]> = {};
  const doc: any = {
    readyState,
    addEventListener: (event: string, cb: () => void) => {
      (listeners[event] = listeners[event] || []).push(cb);
    },
    removeEventListener: jest.fn(),
  };
  const win: any = {
    document: doc,
    addEventListener: (event: string, cb: () => void) => {
      (listeners[event] = listeners[event] || []).push(cb);
    },
    removeEventListener: jest.fn(),
  };
  const fire = (event: string) => (listeners[event] || []).forEach((cb) => cb());
  return {
    win,
    doc,
    fire,
  };
}

describe('readyProvider', () => {
  test('calls fn immediately via defer when DOM is already ready', async () => {
    const {
      win,
    } = makeWindow('complete');
    const ready = readyProvider(win);
    const calls: number[] = [];
    ready(() => calls.push(1));
    await new Promise((resolve) => setImmediate(resolve));
    expect(calls).toEqual([1]);
  });

  test('queues fn and calls it on DOMContentLoaded', () => {
    const {
      win, fire,
    } = makeWindow('loading');
    const ready = readyProvider(win);
    const calls: number[] = [];
    ready(() => calls.push(1));
    expect(calls).toEqual([]);
    fire('DOMContentLoaded');
    expect(calls).toEqual([1]);
  });

  test('unsubscribe cancels queued fn', () => {
    const {
      win, fire,
    } = makeWindow('loading');
    const ready = readyProvider(win);
    const calls: number[] = [];
    const unsub = ready(() => calls.push(1)) as () => boolean;
    unsub();
    fire('DOMContentLoaded');
    expect(calls).toEqual([]);
  });

  test('calls fn immediately on load event', () => {
    const {
      win, fire,
    } = makeWindow('loading');
    const ready = readyProvider(win);
    const calls: number[] = [];
    ready(() => calls.push(1));
    fire('load');
    expect(calls).toEqual([1]);
  });
});

describe('readyProvider — the rest', () => {
  test('unsubscribing twice; a state change that isn\'t ready waits; ready twice runs once', () => {
    const {
      win, doc, fire,
    } = makeWindow('loading');
    const ready = readyProvider(win);
    const calls: string[] = [];
    const off = ready(() => calls.push('off')) as () => boolean;
    ready((x: string) => calls.push(x), ['on']);
    expect(off()).toBe(true);
    expect(off()).toBe(true);
    fire('readystatechange'); // still loading
    expect(calls).toEqual([]);
    doc.readyState = 'interactive';
    fire('readystatechange');
    fire('load'); // already ready: nothing more
    expect(calls).toEqual(['on']);
  });
});
