import {
  defer, 
} from './defer';
import {
  attachEvent, 
} from './attachEvent';
import {
  isDocumentStateReady, 
} from './is/isDocumentStateReady';

export type TReadyDocumentContext = {
  readyState: string;
  addEventListener(type: string, listener: (e: any) => void, useCapture?: boolean): void;
  removeEventListener(type: string, listener: (e: any) => void, useCapture?: boolean): void;
};

export type TReadyWindowContext = {
  document: TReadyDocumentContext;
  addEventListener(type: string, listener: (e: any) => void, useCapture?: boolean): void;
  removeEventListener(type: string, listener: (e: any) => void, useCapture?: boolean): void;
};

export type TReadyUnsubscribe = () => boolean;

export type TReadyFn = (
  fn: (...args: any[]) => any,
  args?: any[],
  ctx?: any,
) => TReadyUnsubscribe | void;

/**
 * Creates DOM ready helper for given window.
 * 
 * @param w - The window to create the DOM ready helper for.
 * @returns The DOM ready helper.
 * @example
 * const ready = readyProvider(window);
 * ready(() => console.log('DOM is ready')); // => void
 * ready(() => console.log('DOM is ready')); // => void
 */
export const readyProvider = (w: TReadyWindowContext): TReadyFn => {
  const d = w.document;
  let first: any = {};
  let last = first;
  let hasReady = isDocumentStateReady(w);

  attachEvent(
    d as any, 'readystatechange', onChange, false,
  );
  attachEvent(
    d as any, 'DOMContentLoaded', onReady, false,
  );
  attachEvent(
    w as any, 'load', onReady, false,
  );

  return (
    fn: (...args: any[]) => any, args?: any[], ctx?: any,
  ): TReadyUnsubscribe | void => {
    if (hasReady) {
      return defer(
        fn as any, args, ctx,
      ) as TReadyUnsubscribe;
    }
    let watcher: any[] | null = [
      fn,
      args,
      ctx,
    ];
    const node = (last = last.next = {
      watcher,
    });
    return () => {
      if (watcher) {
        node.watcher = watcher = null;
      }
      return true;
    };
  };

  function onReady() {
    if (hasReady) {
      return;
    }
    hasReady = true;
    let item = first;
    let watcher: any[] | null;
    // eslint-disable-next-line no-cond-assign
    while ((item = item.next)) {
      watcher = item.watcher;
      watcher &&
        watcher[0].apply(watcher[2] || null, watcher[1] || []);
    }
    first = {};
  }

  function onChange() {
    isDocumentStateReady(w) && onReady();
  }
};

