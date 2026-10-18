/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
import {
  createBrowserHistory,
} from '../../src/navigation/history';

describe('createBrowserHistory', () => {
  afterEach(() => window.history.replaceState(
    null, '', '/',
  ));

  it('hash mode (default): the path lives after #; push / replace / state', () => {
    const history = createBrowserHistory(window);
    expect(history.path()).toBe('/');
    history.push({
      depth: 1, 
    }, '/notes/3');
    expect(window.location.hash).toBe('#/notes/3');
    expect(history.path()).toBe('/notes/3');
    expect(history.state()).toEqual({
      depth: 1, 
    });
    history.replace({
      depth: 2, 
    }, '/x');
    expect([window.location.hash, history.state()]).toEqual(['#/x', {
      depth: 2, 
    }]);
  });

  it('url mode: the whole address is the path (what routerProvider works with)', () => {
    const history = createBrowserHistory(window, 'url');
    history.push(null, '/shop?item=3#/cart');
    expect(history.path()).toBe('http://localhost/shop?item=3#/cart');
  });

  it('path mode: the path is the address path', () => {
    const history = createBrowserHistory(window, 'path');
    history.push(null, '/feed');
    expect(window.location.pathname).toBe('/feed');
    expect(history.path()).toBe('/feed');
  });

  it('listen: back / forward arrive with their state; go travels; unsubscribe stops it', async () => {
    const history = createBrowserHistory(window);
    history.push({
      n: 1, 
    }, '/one');
    history.push({
      n: 2, 
    }, '/two');
    const seen: unknown[] = [];
    const stop = history.listen((state) => seen.push(state));
    const arrived = new Promise((resolve) => window.addEventListener(
      'popstate', resolve, {
        once: true, 
      },
    ));
    history.go(-1);
    await arrived;
    expect(seen).toEqual([{
      n: 1, 
    }]);
    stop();
    window.dispatchEvent(new PopStateEvent('popstate', {
      state: {
        n: 9, 
      }, 
    }));
    expect(seen).toEqual([{
      n: 1, 
    }]);
  });
});
