const DEFAULT_LIMIT = 100;

export interface ILimitStream {
  (): Promise<any[]>;
  close: () => void;
}

/**
 * Wraps a readable stream and returns a `next()` function that resolves with up to `limit` items per read.
 *
 * @param stream - Source readable stream.
 * @param limit - Maximum items per batch (default: 100).
 * @returns A `next()` function with a `.close()` method to stop the stream.
 * @example
 * const next = limitStream(jsonlStream, 50);
 * const batch = await next(); // => up to 50 parsed objects
 */
export function limitStream(
  stream: NodeJS.ReadableStream & { close?: () => void },
  limit: number = DEFAULT_LIMIT,
): ILimitStream {
  let hasEnd = false;
  let hasError = false;
  let error: any;
  let rejectFn: (err: any) => void = () => {};

  function onError(err: any): void {
    console.error('stream:error', err);
    hasEnd = true;
    hasError = true;
    error = err;
    rejectFn(err);
    close();
  }

  stream.on('end', () => {
    hasEnd = true;
  });
  stream.on('error', onError);

  function close(): void {
    stream.close?.();
  }

  function next(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (hasError) {
        reject(error);
        return;
      }
      if (hasEnd) {
        resolve([]);
        return;
      }
      rejectFn = reject;
      stream.once('readable', () => {
        try {
          const items: any[] = [];
          let item: any;
          let i = 0;
          while (i < limit && (item = (stream as any).read()) !== null) {
            items.push(item);
            i++;
          }
          resolve(items);
        } catch (e) {
          onError(e);
        }
      });
    });
  }
  (next as ILimitStream).close = close;

  return next as ILimitStream;
}
