
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
 */
export const provider = <TResult = string | ArrayBuffer>(fnName: string) => {
  return function blobToText(blob: Blob): Promise<TResult> {
    return new Promise((resolve, reject) => {
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
      return () => {
        _reader && (
          _reader.abort && _reader.abort(),
          clear()
        );
      };
    });
  };
};