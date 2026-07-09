/**
 * Creates a sending queue.
 * 
 * @param fn - The function to send.
 * @returns The sending queue.
 * @example
 * sendingQueue((...args) => Promise.resolve()); // => { (...args: any[]): Promise<any>, drain(): Promise<any> }
 */
export function sendingQueue<
  F extends (...args: any[]) => Promise<any> = (...args: any[]) => any,
>(fn: F): {
  (...args: Parameters<F>): Promise<any>,
  drain(): Promise<any>
} {
  let promises: Promise<any>[] = [];
  const errors: any[] = [];
  const onError = errors.push.bind(errors);

  function send() {
    if (errors.length) {
      return Promise.reject(errors[0]);
    }
    const promise = fn
      .apply(null, arguments)
      .catch(onError)
      .then(() => {
        promises = promises.filter((v) => v !== promise);
        if (errors.length) {
          throw errors[0];
        }
      });
    promises.push(promise);
    return promises.length > 1
      ? promises[0]
      : Promise.resolve();
  }

  send.drain = () => promises.length ? Promise.all(promises) : Promise.resolve();

  return send as any;
}
