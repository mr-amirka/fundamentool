export type TChainHandler<TReq = any> = (
  req: TReq,
  next: (req?: TReq) => any,
) => any;

export type TChainErrorHandler<TReq = any> = (error: unknown, req: TReq) => void;

/**
 * Runs a chain of handlers; each calls next(req) to continue.
 *
 * If a handler throws, the error is passed to `onError` (if provided) and
 * the chain **continues** with the next handler — the error does not stop execution.
 *
 * @param chain - The chain of handlers.
 * @param req - The request object.
 * @param end - Called when the chain is exhausted.
 * @param onError - Optional callback invoked when a handler throws.
 * @returns The result of the chain.
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
    if (!handler) return end(_req);
    const ni = i + 1;
    try {
      return handler(_req, (r?: TReq) => next(r ?? _req, ni));
    } catch (ex) {
      onError?.(ex, _req);
      return next(_req, ni);
    }
  }
  return next(req, 0);
}
