export type TChainHandler<TReq = any> = (
  req: TReq,
  next: (req?: TReq) => any,
) => any;

export type TChainErrorHandler<TReq = any> = (error: unknown, req: TReq) => void;

/**
 * Runs a chain of handlers; each calls `next(req)` to continue — `next()` (or `next(undefined)`) with the same `req`.
 *
 * A handler that throws: with `onError`, the error is passed to it and the chain **continues** with the next handler;
 * without it, the error reaches the caller (fundamentool D-087 — before, it was lost). `fundamentool/hooks`'
 * `chainHook` runs on it.
 *
 * @param chain - The chain of handlers.
 * @param req - The request object.
 * @param end - Called when the chain is exhausted.
 * @param onError - Called when a handler throws; the chain then goes on.
 * @returns The result of the chain.
 * @throws a handler's error, when there is no `onError`.
 * @example
 * responsibilityChain([(req, next) => next(req + 1)], 0, (req) => req); // => 1
 * @example
 * responsibilityChain(
 *   [(req, next) => { throw new Error('oops'); }],
 *   {},
 *   (req) => req,
 *   (err) => console.error(err),
 * );
 */
export function responsibilityChain<TReq = any>(
  chain: TChainHandler<TReq>[],
  req: TReq,
  end: (req: TReq) => any,
  onError?: TChainErrorHandler<TReq>,
): any {
  function next(_req: TReq, i: number): any {
    const handler = chain[i];
    if (!handler) {
      return end(_req);
    }
    const ni = i + 1;
    const onward = (r?: TReq): any => next(r === undefined ? _req : r, ni);
    if (!onError) {
      return handler(_req, onward);
    }
    try {
      return handler(_req, onward);
    } catch (ex) {
      onError(ex, _req);
      return next(_req, ni);
    }
  }
  return next(req, 0);
}
