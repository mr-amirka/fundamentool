/**
 * Creates a sending queue: calls `fn` at once for every send, and makes the caller wait only while an earlier send is
 * still in flight (back-pressure). The first failure is kept: the next sends reject with it at once, and so does
 * `drain()` — a failed send never rejects on its own, unheard.
 *
 * @param fn - The function to send.
 * @returns The sending queue.
 * @example
 * const send = sendingQueue((rows) => api.save(rows));
 * for (const rows of batches) await send(rows); // waits only behind the oldest send in flight
 * await send.drain();                           // every send settled; rejects with the first failure
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
  const check = () => {
    if (errors.length) {
      throw errors[0];
    }
  };

  function send() {
    if (errors.length) {
      return Promise.reject(errors[0]);
    }
    const promise = fn
      .apply(null, arguments)
      .catch(onError)
      .then(() => {
        promises = promises.filter((v) => v !== promise);
      });
    promises.push(promise);
    return promises.length > 1
      ? promises[0].then(check)
      : Promise.resolve();
  }

  send.drain = () => Promise.all(promises).then(check);

  return send as any;
}
