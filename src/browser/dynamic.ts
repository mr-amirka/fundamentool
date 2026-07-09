import {
  urlExtend, 
} from '../urlExtend';
import {
  script, 
} from './script';

const cache: Record<string, Promise<void>> = {};

/**
 * Dynamically loads an external script with caching.
 * Subsequent calls with the same resolved URL return the cached promise.
 *
 * @param url - Script URL.
 * @param options - Optional URL extension options.
 * @returns Promise resolved when the script is loaded.
 * @example
 * await dynamic('https://cdn.example.com/lib.js');
 */
export const dynamic = (url: string, options?: Record<string, any>): Promise<void> => {
  const href = urlExtend(url, options).href;
  const current = cache[href];
  if (current) {
    return current;
  }
  const promise = (script as any).base(href).catch((err: any) => {
    delete cache[href];
    throw err;
  });
  return cache[href] = promise;
};

