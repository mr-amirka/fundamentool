
import { GLOBAL_CONTEXT } from '../globalContext';
import { once } from '../once';
import { defer } from '../defer';
import { urlExtend } from '../urlExtend';

interface IScript {
  (url: string, options?: Record<string, any>): Promise<void>;
  base: (url: string) => Promise<void>;
}

/**
 * Loads a script by URL (with optional query options) and resolves when loaded.
 * @param url - The URL of the script to load.
 * @param options - The options for the script.
 * @returns A promise that resolves when the script is loaded.
 * @example
 * await script('https://cdn.example.com/lib.js');
 */
export const script: IScript = (
  url: string,
  options?: Record<string, any>,
): Promise<void> => base(urlExtend(url, options).href);

const base = script.base = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const doc = GLOBAL_CONTEXT.document;
    if (!doc) {
      reject(new Error('Document is not found'));
      return;
    }
    const instance: HTMLScriptElement = doc.createElement('script');
    const head = doc.head;

    const remove = once(() => {
      const parentNode = instance.parentNode;
      if (parentNode) {
        parentNode.removeChild(instance);
      }
    });

    const execute = once(() => {
      defer(remove);
      resolve();
    });

    (instance as any).onreadystatechange = () => {
      if (/complete|loaded/.test((instance as any).readyState)) {
        execute();
      }
    };
    instance.onload = execute;
    instance.onerror = (error: any) => {
      remove();
      reject(error);
    };

    instance.async = true;
    instance.src = url;

    head.appendChild(instance);
  });
};


