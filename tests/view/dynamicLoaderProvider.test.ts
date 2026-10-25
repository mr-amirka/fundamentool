/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * Parts in files of their own (web-games D-100): the shop's module is declared where it's used and its content picked
 * out of it; the boot fetches every declared module with the total readiness as its progress; a module that can't come
 * is listed among the failed, shows the app's message and Retry, and `retry()` fetches the failed ones again.
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act,
} from 'react';
import {
  createRoot,
} from 'react-dom/client';
import type {
  Root,
} from 'react-dom/client';
import {
  dynamicLoaderProvider,
} from '../../src/view';
import type {
  TDynamicLoaderOptions,
} from '../../src/view';

const h = React.createElement;
const createLoader = (options?: TDynamicLoaderOptions) => dynamicLoaderProvider(React, options);

/** A module whose file arrives when `arrive()` is called, or fails with `fail()`. */
function file() {
  const calls: Array<{ arrive: () => void;
    fail: () => void }> = [];
  const value = {
    ShopContent: (props: { title?: string }) => h(
      'b', {
        'data-shop': '',
      }, props.title ?? 'shop',
    ),
    ShopFooter: () => h(
      'i', {
        'data-footer': '',
      }, 'footer',
    ),
  };
  const load = () => new Promise<typeof value>((resolve, reject) => {
    calls.push({
      arrive: () => resolve(value),
      fail: () => reject(new Error('offline')),
    });
  });
  return {
    load,
    calls,
  };
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});

const render = (node: React.ReactNode) => act(() => root.render(node));
const settle = () => act(async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
});

describe('dynamicLoaderProvider', () => {
  it('a module is declared — registered, not fetched; a component picked out of it fetches it once when shown', async () => {
    const dynamic = createLoader();
    const shop = file();
    const shopModule = dynamic.module(shop.load);
    const ShopContent = dynamic.component(shopModule, (m) => m.ShopContent);
    const ShopFooter = dynamic.component(shopModule, (m) => m.ShopFooter);
    expect(shop.calls).toHaveLength(0);
    expect(shopModule.status).toBe('idle');
    expect(dynamic.$state.getState()).toEqual({
      total: 1,
      loaded: 0,
      failed: [],
    });

    render(h(
      'div', null, h(ShopContent, {
        title: 'Shop',
      }), h(ShopFooter),
    ));
    expect(container.textContent).toBe('');
    await settle();
    expect(shop.calls).toHaveLength(1);
    shop.calls[0].arrive();
    await settle();
    expect(container.querySelector('[data-shop]')?.textContent).toBe('Shop');
    expect(container.querySelector('[data-footer]')).not.toBeNull();
    expect(shopModule.status).toBe('loaded');
    expect(dynamic.$state.getState().loaded).toBe(1);
  });

  it('on its way — the app\'s loading look; failed — listed, its message and Retry, which fetches again', async () => {
    const dynamic = createLoader({
      renderLoading: () => h('span', {
        'data-loading': '',
      }),
      renderFailed: ({
        error, retry,
      }) => h(
        'button', {
          'data-failed': String((error as Error).message),
          'onClick': retry,
        }, 'Retry',
      ),
    });
    const shop = file();
    const shopModule = dynamic.module(shop.load);
    render(h(dynamic.component(shopModule, (m) => m.ShopContent)));
    expect(container.querySelector('[data-loading]')).not.toBeNull();
    await settle();
    shop.calls[0].fail();
    await settle();
    expect(dynamic.$state.getState().failed).toEqual([shopModule]);
    expect((shopModule.error as Error).message).toBe('offline');
    act(() => (container.querySelector('[data-failed]') as HTMLButtonElement).click());
    await settle();
    expect(container.querySelector('[data-loading]')).not.toBeNull();
    // Still offline: failed again — Retry stays
    shop.calls[1].fail();
    await settle();
    act(() => (container.querySelector('[data-failed]') as HTMLButtonElement).click());
    await settle();
    shop.calls[2].arrive();
    await settle();
    expect(container.querySelector('[data-shop]')).not.toBeNull();
    expect(dynamic.$state.getState().failed).toEqual([]);
  });

  it('without a look for loading and failure: nothing shown', async () => {
    const dynamic = createLoader();
    const shop = file();
    render(h(dynamic.component(dynamic.module(shop.load), (m) => m.ShopContent)));
    await settle();
    shop.calls[0].fail();
    await settle();
    expect(container.innerHTML).toBe('');
  });

  it('preload — every module; retry — only the failed ones; load() — one module by hand', async () => {
    const dynamic = createLoader();
    const shop = file();
    const chats = file();
    dynamic.module(shop.load);
    const chatsModule = dynamic.module(chats.load);
    const first = dynamic.preload();
    await settle();
    shop.calls[0].arrive();
    chats.calls[0].fail();
    await expect(first).rejects.toThrow('offline');
    expect(dynamic.$state.getState()).toEqual({
      total: 2,
      loaded: 1,
      failed: [chatsModule],
    });
    const again = dynamic.retry();
    await settle();
    expect(shop.calls).toHaveLength(1);
    chats.calls[1].arrive();
    await again;
    expect(dynamic.$state.getState()).toEqual({
      total: 2,
      loaded: 2,
      failed: [],
    });
    // Everything in: a preload resolves at once
    await expect(dynamic.preload()).resolves.toBeUndefined();
    await expect(chatsModule.load()).resolves.toHaveProperty('ShopContent');
    // Fetched ahead: shown at once
    render(h(dynamic.component(chatsModule, (m) => m.ShopContent)));
    expect(container.querySelector('[data-shop]')).not.toBeNull();
  });

  it('options, the view library and a module of another loader are checked', () => {
    expect(() => createLoader({
      renderFailed: 'Retry' as never,
    })).toThrow(/renderFailed/);
    expect(() => dynamicLoaderProvider({} as never)).toThrow(/createElement/);
    const other = createLoader().module(file().load);
    expect(() => createLoader().component(other, (m) => m.ShopContent)).toThrow(/wasn't declared by this loader/);
  });
});
