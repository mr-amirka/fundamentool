/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * Components in files of their own, declared where they're used (web-games D-097, D-098): the shop's content loads when
 * the shop opens; the boot fetches every declared module with the total readiness as its progress; a module that can't
 * come shows the app's message and Retry.
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
  dynamicComponentsProvider,
} from '../../src/view';
import type {
  TDynamicState,
} from '../../src/view';

const h = React.createElement;
const {
  createDynamicComponents,
} = dynamicComponentsProvider(React);

/** A module whose file arrives when `arrive()` is called, or fails with `fail()`. */
function file() {
  const calls: Array<{ arrive: () => void;
    fail: () => void }> = [];
  const module = {
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
  const load = () => new Promise<typeof module>((resolve, reject) => {
    calls.push({
      arrive: () => resolve(module),
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

describe('dynamicComponentsProvider', () => {
  it('declared — registered, not fetched; rendered — fetched once, every export of it shown; the registry counts it', async () => {
    const instance = createDynamicComponents();
    const shop = file();
    const states: TDynamicState[] = [];
    instance.$state.watch((state) => states.push(state));
    const dynamicComponents = instance(shop.load);
    expect(shop.calls).toHaveLength(0);
    expect(instance.$state.getState()).toEqual({
      total: 1,
      loaded: 0,
      failed: 0,
    });

    render(h(
      'div', null, h(dynamicComponents.ShopContent, {
        title: 'Shop',
      }), h(dynamicComponents.ShopFooter),
    ));
    expect(container.textContent).toBe('');
    await settle();
    expect(shop.calls).toHaveLength(1);
    shop.calls[0].arrive();
    await settle();
    expect(container.querySelector('[data-shop]')?.textContent).toBe('Shop');
    expect(container.querySelector('[data-footer]')).not.toBeNull();
    expect(instance.$state.getState()).toEqual({
      total: 1,
      loaded: 1,
      failed: 0,
    });
    // The same export is the same component
    expect(dynamicComponents.ShopContent).toBe(dynamicComponents.ShopContent);
  });

  it('on its way — the app\'s loading look; failed — its message with Retry, which fetches again', async () => {
    const instance = createDynamicComponents({
      renderLoading: () => h('span', {
        'data-loading': '',
      }),
      renderFailed: ({
        error, retry,
      }) => h(
        'button', {
          'data-failed': String((error as Error).message),
          onClick: retry,
        }, 'Retry',
      ),
    });
    const shop = file();
    const dynamicComponents = instance(shop.load);
    render(h(dynamicComponents.ShopContent));
    expect(container.querySelector('[data-loading]')).not.toBeNull();
    await settle();
    shop.calls[0].fail();
    await settle();
    const retry = container.querySelector('[data-failed]') as HTMLButtonElement;
    expect(retry.getAttribute('data-failed')).toBe('offline');
    expect(instance.$state.getState()).toEqual({
      total: 1,
      loaded: 0,
      failed: 1,
    });
    act(() => retry.click());
    await settle();
    expect(shop.calls).toHaveLength(2);
    expect(container.querySelector('[data-loading]')).not.toBeNull();
    // Still offline: failed again — Retry stays
    shop.calls[1].fail();
    await settle();
    act(() => (container.querySelector('[data-failed]') as HTMLButtonElement).click());
    await settle();
    expect(shop.calls).toHaveLength(3);
    shop.calls[2].arrive();
    await settle();
    expect(container.querySelector('[data-shop]')).not.toBeNull();
    expect(instance.$state.getState()).toEqual({
      total: 1,
      loaded: 1,
      failed: 0,
    });
  });

  it('without a look for loading and failure: nothing shown', async () => {
    const instance = createDynamicComponents();
    const shop = file();
    render(h(instance(shop.load).ShopContent));
    await settle();
    shop.calls[0].fail();
    await settle();
    expect(container.innerHTML).toBe('');
  });

  it('preload: every module declared, the total readiness as it goes; rejects with a failure, resolves when all are in', async () => {
    const instance = createDynamicComponents();
    const shop = file();
    const chats = file();
    instance(shop.load);
    const chatsComponents = instance(chats.load);
    const loadedCounts: number[] = [];
    instance.$state.watch((state) => loadedCounts.push(state.loaded));
    const first = instance.preload();
    await settle();
    shop.calls[0].arrive();
    chats.calls[0].fail();
    await expect(first).rejects.toThrow('offline');
    expect(instance.$state.getState()).toEqual({
      total: 2,
      loaded: 1,
      failed: 1,
    });
    const second = instance.preload();
    await settle();
    chats.calls[1].arrive();
    await second;
    expect(instance.$state.getState()).toEqual({
      total: 2,
      loaded: 2,
      failed: 0,
    });
    expect(loadedCounts.at(-1)).toBe(2);
    // Preloaded: shown at once
    render(h(chatsComponents.ShopContent));
    expect(container.querySelector('[data-shop]')).not.toBeNull();
  });

  it('options and the view library are checked', () => {
    expect(() => createDynamicComponents({
      renderFailed: 'Retry' as never,
    })).toThrow(/renderFailed/);
    expect(() => dynamicComponentsProvider({} as never)).toThrow(/createElement/);
  });
});
