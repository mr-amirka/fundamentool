/**
 * @jest-environment jsdom
 */
import {
  act,
  createElement as h,
  createRoot,
  useEffect,
  useLayoutEffect,
  useState,
} from '../../src/vdom';
import React, * as named from '../../src/vdom/react';

describe('vdom — act', () => {
  it('renders the updates of its work, runs the layout and the passive effects before it returns', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const log: string[] = [];
    let setN: (n: number) => void = () => undefined;
    function Counter(): any {
      const [
        n,
        set,
      ] = useState(0);
      setN = set;
      useLayoutEffect(() => {
        log.push('layout ' + n);
      });
      useEffect(() => {
        log.push('effect ' + n);
      });
      return n;
    }
    act(() => root.render(h(Counter)));
    expect(log).toEqual([
      'layout 0',
      'effect 0',
    ]);
    act(() => setN(1));
    expect(container.textContent).toBe('1');
    expect(log.slice(2)).toEqual([
      'layout 1',
      'effect 1',
    ]);
    act(() => root.unmount());
  });

  it('a state set in a passive effect is rendered too; the promise gives what the work returned', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    function Loaded(): any {
      const [
        text,
        setText,
      ] = useState('loading');
      useEffect(() => {
        setText('ready');
      }, []);
      return text;
    }
    await expect(act(() => {
      root.render(h(Loaded));
      return 7;
    })).resolves.toBe(7);
    expect(container.textContent).toBe('ready');
    act(() => root.unmount());
  });

  it('async work: the updates are flushed once it resolves', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let setN: (n: number) => void = () => undefined;
    function Counter(): any {
      const [
        n,
        set,
      ] = useState(0);
      setN = set;
      return n;
    }
    act(() => root.render(h(Counter)));
    const value = await act(async () => {
      await Promise.resolve();
      setN(5);
      return 'done';
    });
    expect(value).toBe('done');
    expect(container.textContent).toBe('5');
    act(() => root.unmount());
  });

  it('async work: what its effects start is waited for, as long as updates keep coming', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    function Lazy(): any {
      const [
        text,
        setText,
      ] = useState('loading');
      useEffect(() => {
        setTimeout(() => setText('loaded'), 0);
      }, []);
      return text;
    }
    await act(async () => {
      root.render(h(Lazy));
    });
    expect(container.textContent).toBe('loaded');
    act(() => root.unmount());
  });

  it('an effect setting state on every render throws instead of hanging', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    function Loop(): any {
      const [
        n,
        setN,
      ] = useState(0);
      useEffect(() => {
        setN(n + 1);
      });
      return n;
    }
    expect(() => act(() => root.render(h(Loop)))).toThrow('Maximum update depth exceeded: an effect sets state');
    root.unmount();
  });
});

describe('vdom — the react stand-in', () => {
  it('has every member, and the namespace as its default export', () => {
    expect(named.createElement).toBe(h);
    expect(React.useState).toBe(useState);
    expect(React.act).toBe(act);
  });
});
