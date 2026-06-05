import {
  TRpcExtrernalFnProvider,
  TRpcEncodedValueFn,
  TRpcFn,
} from '../types';

/**
 * Tracks and encodes/decodes functions across an RPC boundary.
 * Internal functions (passed as arguments) are stored by index;
 * external functions (received from the remote side) are lazily created via `provider`.
 *
 * @example
 * const coder = new RpcFnCoder((index) => (...args) => client.callFn(index, args));
 * const encoded = coder.encode(myFn); // => [0, 0]
 * const decoded = coder.decode(encoded); // => myFn (reconstructed)
 */
export class RpcFnCoder {
  internals: [TRpcFn, ctx: any][] = [];
  externals: TRpcFn[] = [];

  private provider: TRpcExtrernalFnProvider;

  constructor(provider: TRpcExtrernalFnProvider) {
    this.provider = provider;
  }

  addInternal(fn: TRpcFn, ctx?: any) {
    const {
      internals,
    } = this;
    internals.push([fn, ctx]);
    return internals.length - 1;
  }

  invoke(index: number, args: any[]) {
    const value = this.internals[index];
    return value[0].apply(value[1], args);
  }

  encode(fn: TRpcFn, context?: any, withInternalFns = true): TRpcEncodedValueFn | undefined {
    let index = this.externals.indexOf(fn);
    if (index > -1) {
      return [1, index];
    }

    if (!withInternalFns) {
      return;
    }

    const {
      internals,
    } = this;

    index = internals.findIndex((v) => v[0] === fn && v[1] === context);

    if (index === -1) {
      index = internals.length;
      internals.push([fn, context]);
    }
    return [0, index];
  }

  decode(encodedFnValue: TRpcEncodedValueFn, withExternalFns = true): TRpcFn | undefined {
    if (encodedFnValue[0]) {
      return this.internals[encodedFnValue[1]][0];
    }

    if (!withExternalFns) {
      return;
    }

    const index = encodedFnValue[1];
    const externals = this.externals;
    return externals[index] || (externals[index] = this.provider(index));
  }
}
