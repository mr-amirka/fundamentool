import {
  TRpcEncodedValueSymbol,
} from '../types';


/**
 * Tracks and encodes/decodes `symbol` values across an RPC boundary.
 * Internal symbols are indexed by position; external symbols are recreated from their string name.
 *
 * @example
 * const coder = new RpcSymbolCoder();
 * const encoded = coder.encode(Symbol('myKey'), 0); // => [0, 0, 0]
 * const decoded = coder.decode(encoded, ['myKey']); // => Symbol('myKey')
 */
export class RpcSymbolCoder {
  private internals: symbol[] = [];
  private externals: symbol[] = [];

  encode(symbolValue: symbol, stringIndex: number): TRpcEncodedValueSymbol {
    let fnIndex = this.externals.indexOf(symbolValue);

    if (fnIndex > -1) {
      return [
        1,
        fnIndex,
        stringIndex,
      ];
    }

    const {
      internals,
    } = this;

    fnIndex = internals.indexOf(symbolValue);
    if (fnIndex === -1) {
      fnIndex = internals.length;
      internals.push(symbolValue);
    }
    return [
      0,
      fnIndex,
      stringIndex,
    ];
  }

  decode(encodedSymbol: TRpcEncodedValueSymbol, strings: string[]): symbol {
    if (encodedSymbol[0]) {
      return this.internals[encodedSymbol[1]];
    }

    const index = encodedSymbol[1];
    const externals = this.externals;
    return externals[index] || (externals[index] = Symbol(strings[encodedSymbol[2]]));
  }
}
