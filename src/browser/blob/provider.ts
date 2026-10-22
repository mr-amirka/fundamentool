import {
  noop,
} from '../../noop';


/**
 * Creates a `Blob -> Promise<TResult>` converter based on `FileReader` method name.
 *
 * Example: `provider('readAsText')` produces a function that reads a blob as text.
 *
 * @param fnName - `FileReader` method name (e.g. `readAsText`, `readAsDataURL`).
 * @returns A function that reads a Blob using the given `FileReader` method.
 * @example
 * const toText = provider('readAsText');
 * const text = await toText(blob); // => 'hello'
 * const reading = toText(big); reading.cancel(); // the read stopped
 */
export const provider = <TResult = string | ArrayBuffer>(fnName: string) => {
  return function blobToText(blob: Blob): Promise<TResult> & { cancel: () => void } {
    let cancel = noop;
    const promise = new Promise<TResult>((resolve, reject) => {
      let _reader = new FileReader();
      function clear() {
        _reader = _reader.onload = _reader.onerror = null;
      }
      _reader.onload = () => {
        _reader && (
          resolve(_reader.result as TResult),
          clear()
        );
      };
      _reader.onerror = (error) => {
        _reader && (
          clear(),
          reject(error)
        );
      };
      _reader[fnName](blob);
      // The read stopped: the reader aborted, the promise left unsettled (a Promise ignores what its executor
      // returns — the cancel is the promise's own member)
      cancel = () => {
        _reader && (
          _reader.abort(),
          clear()
        );
      };
    });
    return Object.assign(promise, {
      cancel,
    });
  };
};
