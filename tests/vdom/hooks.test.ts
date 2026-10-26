/**
 * @jest-environment jsdom
 */
import {
  createElement as h,
  createRoot,
  forwardRef,
  useCallback,
  useDebugValue,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from '../../src/vdom';
import type {
  TRoot,
} from '../../src/vdom';

function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

let container: HTMLElement;
let root: TRoot;

beforeEach(() => {
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
});

describe('vdom — state hooks', () => {
  it('useState: lazy init once, functional updates, the same value renders nothing, a stable setter', async () => {
    let init = 0;
    let renders = 0;
    const setters: any[] = [];
    function Counter(): any {
      const [
        n,
        setN,
      ] = useState(() => {
        init++;
        return 1;
      });
      renders++;
      setters.push(setN);
      return n;
    }
    root.render(h(Counter));
    setters[0]((n: number) => n + 1);
    setters[0]((n: number) => n + 1);
    await settle();
    expect(container.textContent).toBe('3');
    setters[0](3);
    await settle();
    expect(renders).toBe(2);
    expect(init).toBe(1);
    expect(setters[1]).toBe(setters[0]);
  });

  it('useReducer: with and without init; the latest reducer is used', async () => {
    let dispatch: (action: number) => void = () => undefined;
    function Sum({
      factor,
    }: any): any {
      const [
        sum,
        send,
      ] = useReducer((state: number, action: number) => state + action * factor, 10);
      const [doubled] = useReducer(
        (state: number) => state, 2, (arg: number) => arg * 2,
      );
      dispatch = send;
      return sum + ':' + doubled;
    }
    root.render(h(Sum, {
      factor: 1,
    }));
    expect(container.textContent).toBe('10:4');
    root.render(h(Sum, {
      factor: 10,
    }));
    dispatch(1);
    await settle();
    expect(container.textContent).toBe('20:4');
  });

  it('useRef keeps its box; with no initial value it starts undefined', () => {
    const boxes: any[] = [];
    function Box(): null {
      boxes.push(useRef(1), useRef());
      return null;
    }
    root.render(h(Box));
    root.render(h(Box));
    expect(boxes[0]).toBe(boxes[2]);
    expect(boxes[0].current).toBe(1);
    expect(boxes[1].current).toBe(undefined);
  });

  it('useMemo / useCallback: kept while the deps are the same; no deps — every render', () => {
    const memos: any[] = [];
    function Memo({
      a,
    }: any): null {
      memos.push(
        useMemo(() => ({
          a,
        }), [a]), useCallback(() => a, [a]), useMemo(() => ({}), undefined),
      );
      return null;
    }
    root.render(h(Memo, {
      a: 1,
    }));
    root.render(h(Memo, {
      a: 1,
    }));
    root.render(h(Memo, {
      a: 2,
    }));
    expect(memos[3]).toBe(memos[0]);
    expect(memos[4]).toBe(memos[1]);
    expect(memos[5]).not.toBe(memos[2]);
    expect(memos[6]).not.toBe(memos[0]);
    expect(memos[7]()).toBe(2);
  });

  it('useId: unique, kept, valid in a selector', () => {
    const ids: string[] = [];
    function Ids(): null {
      ids.push(useId(), useId());
      return null;
    }
    root.render(h(Ids));
    root.render(h(Ids));
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[2]).toBe(ids[0]);
    expect(ids[0]).toMatch(/^_r_[0-9a-v]+_$/);
    expect(() => document.querySelector('#' + ids[0])).not.toThrow();
  });

  it('useDebugValue does nothing', () => {
    function Debug(): string {
      useDebugValue('label', (value) => value);
      return 'ok';
    }
    root.render(h(Debug));
    expect(container.textContent).toBe('ok');
  });
});

describe('vdom — effect hooks', () => {
  it('deps: run again when one changed or their count did; the cleanup first', async () => {
    const log: string[] = [];
    function Effect({
      deps,
    }: any): null {
      useLayoutEffect(() => {
        log.push('layout ' + deps);
        return () => log.push('cleanup ' + deps);
      }, deps);
      return null;
    }
    root.render(h(Effect, {
      deps: [1],
    }));
    root.render(h(Effect, {
      deps: [1],
    }));
    root.render(h(Effect, {
      deps: [2],
    }));
    root.render(h(Effect, {
      deps: [
        2,
        3,
      ],
    }));
    expect(log).toEqual([
      'layout 1',
      'cleanup 1',
      'layout 2',
      'cleanup 2',
      'layout 2,3',
    ]);
  });

  it('useInsertionEffect runs during the render, before the layout effects', () => {
    const log: string[] = [];
    function Styled(): null {
      useLayoutEffect(() => {
        log.push('layout');
      });
      useInsertionEffect(() => {
        log.push('insertion');
        return () => log.push('insertion cleanup');
      });
      return null;
    }
    root.render(h(Styled));
    root.render(h(Styled));
    expect(log).toEqual([
      'insertion',
      'layout',
      'insertion cleanup',
      'insertion',
      'layout',
    ]);
  });

  it('an effect that returns no function has no cleanup', async () => {
    const log: string[] = [];
    function Effect(): null {
      useEffect(() => {
        log.push('run');
        return 1 as any;
      });
      return null;
    }
    root.render(h(Effect));
    await settle();
    root.render(h(Effect));
    await settle();
    expect(log).toEqual([
      'run',
      'run',
    ]);
  });

  it('useImperativeHandle: object and callback refs, refreshed with the deps, cleared on unmount', () => {
    const Field = forwardRef((props: any, ref: any) => {
      useImperativeHandle(
        ref, () => ({
          id: props.id,
        }), [props.id],
      );
      return null;
    });
    const objectRef = {
      current: null as any,
    };
    root.render(h(Field, {
      ref: objectRef,
      id: 1,
    }));
    expect(objectRef.current).toEqual({
      id: 1,
    });
    root.render(h(Field, {
      ref: objectRef,
      id: 2,
    }));
    expect(objectRef.current).toEqual({
      id: 2,
    });
    const calls: any[] = [];
    root.render(h(Field, {
      ref: (value: any) => {
        calls.push(value);
      },
      id: 3,
    }));
    expect(objectRef.current).toBe(null);
    const cleanup = jest.fn();
    root.render(h(Field, {
      ref: (value: any) => {
        calls.push(value);
        return cleanup;
      },
      id: 3,
    }));
    expect(calls).toEqual([
      {
        id: 3,
      },
      null,
      {
        id: 3,
      },
    ]);
    root.render(null);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('useImperativeHandle without deps or a ref', () => {
    let made = 0;
    function Handle({
      handleRef,
    }: any): null {
      useImperativeHandle(handleRef, () => ++made);
      return null;
    }
    const ref = {
      current: 0,
    };
    root.render(h(Handle, {
      handleRef: ref,
    }));
    root.render(h(Handle, {
      handleRef: ref,
    }));
    expect(ref.current).toBe(2);
    root.render(h(Handle, {
      handleRef: null,
    }));
    expect(made).toBe(2);
  });

  it('useEffectEvent: a stable function calling the latest callback with its this and arguments', () => {
    const events: any[] = [];
    function Probe({
      n,
    }: any): null {
      events.push(useEffectEvent(function (this: any, add: number) {
        return [
          this,
          n + add,
        ];
      }));
      return null;
    }
    root.render(h(Probe, {
      n: 1,
    }));
    root.render(h(Probe, {
      n: 2,
    }));
    expect(events[1]).toBe(events[0]);
    const self = {};
    expect(events[0].call(self, 10)).toEqual([
      self,
      12,
    ]);
  });
});

describe('vdom — useSyncExternalStore', () => {
  function createStore(value: number): any {
    const listeners = new Set<() => void>();
    return {
      get: () => value,
      set(next: number): void {
        value = next;
        listeners.forEach((listener) => listener());
      },
      subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      listeners,
    };
  }

  it('renders the snapshot, again when it changes, unsubscribes on unmount', async () => {
    const store = createStore(1);
    let renders = 0;
    function Show(): any {
      renders++;
      return useSyncExternalStore(store.subscribe, store.get);
    }
    root.render(h(Show));
    await settle();
    expect(store.listeners.size).toBe(1);
    store.set(2);
    await settle();
    expect(container.textContent).toBe('2');
    store.set(2);
    await settle();
    expect(renders).toBe(2);
    root.render(null);
    expect(store.listeners.size).toBe(0);
  });

  it('a change between the render and the subscription is not lost', async () => {
    const store = createStore(1);
    function Show(): any {
      const value = useSyncExternalStore(store.subscribe, store.get);
      useLayoutEffect(() => {
        if (value === 1) {
          store.set(5);
        }
      }, [value]);
      return value;
    }
    root.render(h(Show));
    await settle();
    await settle();
    expect(container.textContent).toBe('5');
  });
});
