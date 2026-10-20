/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * History primitives (fundamentool D-039): three nested parts of one timeline — the address, its hash, the entry's
 * own state — over the browser's history and over an array.
 */
import {
  TextDecoder,
  TextEncoder,
} from 'util';
import {
  urlParse,
} from '../../src/urlParse';
import {
  browserHistoryPrimitivesProvider,
  memoryHistoryPrimitivesProvider,
} from '../../src/router';
import {
  settle,
  waitFor,
} from './_harness';

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
});
const {
  JSDOM,
} = require('jsdom') as typeof import('jsdom');

function windowAt(url: string): Window {
  return new JSDOM('<!doctype html><html><body></body></html>', {
    url: `http://localhost${url}`,
  }).window as unknown as Window;
}

const at = (href: string) => urlParse(href);

describe('browserHistoryPrimitivesProvider', () => {
  it('reads each part of the current entry; a first visit gets our mark', () => {
    const win = windowAt('/a?x=1#/level/2?y=3');
    const history = browserHistoryPrimitivesProvider(win);
    expect(history.url.current().location).toMatchObject({
      path: '/a',
      query: {
        x: 1,
      },
    });
    expect(history.hash.current().location).toMatchObject({
      path: '/level/2',
      query: {
        y: 3,
      },
    });
    expect(history.state.current()).toMatchObject({
      location: {
        path: '/',
      },
      data: undefined,
    });
    expect(win.history.state).toMatchObject({
      fundamentool: 2,
      index: 0,
    });
    // One set of primitives per window.
    expect(browserHistoryPrimitivesProvider(win)).toBe(history);
  });

  it('parts are nested scopes: a step keeps the outer parts and clears the inner ones', () => {
    const win = windowAt('/a');
    const history = browserHistoryPrimitivesProvider(win);
    history.url.push(at('/b?q=1'), 'url-data');
    history.hash.push(at('/level/1'), 'hash-data');
    history.state.push(at('/step/2'), 'state-data');
    expect(win.location.href).toBe('http://localhost/b?q=1#/level/1');
    expect(history.state.current()).toMatchObject({
      location: {
        path: '/step/2',
      },
      data: 'state-data',
    });
    expect(history.url.current().data).toBe('url-data');

    // A step in the hash clears the state part; the address stays.
    history.hash.push(at('/level/2'));
    expect(history.state.current().location.path).toBe('/');
    expect(history.state.current().data).toBeUndefined();
    expect(history.url.current().data).toBe('url-data');

    // A step in the address clears the hash and the state.
    history.url.replace(at('/c'), 'other');
    expect(win.location.href).toBe('http://localhost/c');
    expect(history.hash.current().location.path).toBe('/');
    expect(win.history.state).toMatchObject({
      index: 4,
      data: {
        url: 'other',
      },
    });
  });

  it('go resolves with the part in the entry arrived at; the player\'s move reaches only the parts it changed', async () => {
    const win = windowAt('/a');
    const history = browserHistoryPrimitivesProvider(win);
    const seen: string[] = [];
    const stopUrl = history.url.watch((entry) => seen.push(`url ${entry.location.path}`));
    history.state.watch((entry) => seen.push(`state ${entry.location.path}`));
    history.url.push(at('/b'));
    history.state.push(at('/inner'));
    await expect(history.url.go(-1)).resolves.toMatchObject({
      location: {
        path: '/b',
      },
    });
    expect(seen).toEqual([]); // the code's own move isn't the player's
    await expect(history.url.go(0)).resolves.toMatchObject({
      location: {
        path: '/b',
      },
    });

    win.history.forward(); // the state part changed, the address didn't
    await waitFor(() => expect(seen).toEqual(['state /inner']));
    win.history.back();
    await waitFor(() => expect(seen).toHaveLength(2));
    win.history.back(); // the address changed; the state part reads `/` in both
    await waitFor(() => expect(seen).toHaveLength(3));
    stopUrl();
    win.history.forward();
    await settle(30);
    expect(seen).toEqual([
      'state /inner',
      'state /',
      'url /a',
    ]);
  });

  it('a jump back over entries by the player (Chrome\'s skip) lands one entry back', async () => {
    const win = windowAt('/a');
    const history = browserHistoryPrimitivesProvider(win);
    const seen: string[] = [];
    history.url.watch((entry) => seen.push(entry.location.path as string));
    history.url.push(at('/b'));
    history.url.push(at('/c'));
    win.history.go(-2);
    await waitFor(() => expect(seen).toEqual(['/b']));
    expect(win.location.pathname).toBe('/b');
  });

  it('href: what the address bar shows for a location in each part', () => {
    const win = windowAt('/a#/x');
    const history = browserHistoryPrimitivesProvider(win);
    expect(history.url.href(at('/b?q=1'))).toBe('/b?q=1');
    expect(history.url.href(at(''))).toBe('/');
    expect(history.hash.href(at('/level/2'))).toBe('#/level/2');
    expect(history.hash.href(at(''))).toBe('#/');
    expect(history.state.href(at('/any'))).toBe('/a#/x');
    history.url.push(at('/b'));
    expect(history.state.href(at('/any'))).toBe('/b');
  });

  it('an entry another script wrote is read without data; leaving it for ours is no change', async () => {
    const win = windowAt('/a');
    const history = browserHistoryPrimitivesProvider(win);
    const seen: unknown[] = [];
    history.url.watch((entry) => seen.push(entry.data));
    history.url.push(at('/b'), 'ours');
    win.history.pushState(
      {
        foreign: true,
      }, '', '/c',
    );
    win.history.back(); // from the other script's entry to ours: we never left `/b`
    await settle(30);
    expect(seen).toEqual([]);
    win.history.forward();
    await waitFor(() => expect(seen).toEqual([undefined]));
  });
});

describe('browserHistoryPrimitivesProvider — the timeline\'s ends and entries made by others', () => {
  it('canGo knows the ends; a move past them isn\'t made and settles at once', async () => {
    const win = windowAt('/a');
    const history = browserHistoryPrimitivesProvider(win);
    expect(history.url.canGo(-1)).toBe(false); // before the first entry — another site
    await expect(history.url.go(-1)).resolves.toMatchObject({
      location: {
        path: '/a',
      },
    });
    history.url.push(at('/b'));
    history.url.push(at('/c'));
    expect(history.url.canGo(-2)).toBe(true);
    expect(history.url.canGo(1)).toBe(false);
    await history.url.go(-2);
    expect(history.url.canGo(2)).toBe(true); // seen: the entries ahead exist
    await expect(history.url.go(3)).resolves.toMatchObject({
      location: {
        path: '/a',
      },
    });
    history.url.push(at('/d')); // a new step forgets what was ahead
    expect(history.url.canGo(1)).toBe(false);
    expect(history.url.canGo(-1)).toBe(true);
  });

  it('a hash typed by the player is the next entry: marked, the address\'s data kept, not taken for Chrome\'s skip', async () => {
    const win = windowAt('/a');
    const history = browserHistoryPrimitivesProvider(win);
    const seen: string[] = [];
    history.hash.watch((entry) => seen.push(entry.location.path as string));
    history.url.push(at('/b'), 'url-data');
    history.hash.push(at('/one'));
    win.location.hash = '#/typed';
    await waitFor(() => expect(seen).toEqual(['/typed']));
    expect(win.location.href).toBe('http://localhost/b#/typed');
    expect(win.history.state).toMatchObject({
      index: 3,
      data: {
        url: 'url-data',
      },
    });
    expect(history.url.current().data).toBe('url-data');
    expect(history.url.canGo(1)).toBe(false);
    win.history.back();
    await waitFor(() => expect(seen).toEqual([
      '/typed',
      '/one',
    ]));
  });

  it('a part written again with the same address is a change: its data compares by revision', async () => {
    const win = windowAt('/a');
    const history = browserHistoryPrimitivesProvider(win);
    const seen: unknown[] = [];
    history.hash.watch((entry) => seen.push(entry.data));
    history.hash.push(at('/x'), 'first');
    history.hash.push(at('/x'), 'second');
    win.history.back();
    await waitFor(() => expect(seen).toEqual(['first']));
  });

  it('an entry of an older shape belongs to someone else: read, never overwritten', () => {
    const win = windowAt('/a');
    const old = {
      fundamentool: 1,
      index: 7,
    };
    win.history.replaceState(
      old, '', '/a',
    );
    const history = browserHistoryPrimitivesProvider(win);
    expect(history.url.current().data).toBeUndefined();
    expect(win.history.state).toEqual(old);
  });
});

describe('memoryHistoryPrimitivesProvider', () => {
  it('the same parts over an array: steps, the code\'s moves, the player\'s moves', async () => {
    const history = memoryHistoryPrimitivesProvider('/start#/h');
    expect(history.url.current().location.path).toBe('/start');
    expect(history.hash.current().location.path).toBe('/h');
    const seen: string[] = [];
    history.hash.watch((entry) => seen.push(entry.location.path as string));
    history.hash.push(at('/one'));
    history.hash.push(at('/two'));
    expect(history.entries()).toEqual([
      '/start#/h',
      '/start#/one',
      '/start#/two',
    ]);
    await expect(history.hash.go(-1)).resolves.toMatchObject({
      location: {
        path: '/one',
      },
    });
    expect(history.index()).toBe(1);
    history.navigate(1);
    await waitFor(() => expect(seen).toEqual(['/two']));
    // A move past the end changes nothing, and a `go` there still settles.
    await expect(history.hash.go(5)).resolves.toMatchObject({
      location: {
        path: '/two',
      },
    });
    history.hash.replace(at('/three'));
    expect(history.entries()[2]).toBe('/start#/three');
    history.url.push(at('/next'));
    history.state.push(at('')); // an empty location is `/`
    expect(history.state.current().location.path).toBe('/');
    history.state.replace(at('/s'));
    expect(history.entries()).toEqual([
      '/start#/h',
      '/start#/one',
      '/start#/three',
      '/next',
      '/next',
    ]);
  });

  it('defaults to `/`', () => {
    const history = memoryHistoryPrimitivesProvider();
    expect(history.url.current().location.path).toBe('/');
    expect(memoryHistoryPrimitivesProvider('').url.current().location.path).toBe('/');
  });
});
