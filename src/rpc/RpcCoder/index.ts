import {
  TRpcEncodedType,
  TRpcEncodedValue,
  TRpcEncodedData,
  TRpcEncodedDataObject,
  TRpcExtrernalFnProvider,
  TRpcEncodedDataArray,
  TRpcEncodedValueOther,
  TRpcEncodedValueFn,
} from '../types';
import {
  RpcFnCoder,
} from './RpcFnCoder';
import {
  RpcSymbolCoder,
} from './RpcSymbolCoder';

export * from './RpcFnCoder';
export * from './RpcSymbolCoder';

const RE_REGEXP = /^\/(.*)\/(\w*)$/;
const NON_ENCODABLE_TYPES = [
  'number',
  'string',
  'boolean',
];
const ENCODED_UNDEFINED: TRpcEncodedValue = [TRpcEncodedType.Other, TRpcEncodedValueOther.Undefined];
const ENCODED_INFINITY: TRpcEncodedValue = [TRpcEncodedType.Other, TRpcEncodedValueOther.Infinity];
const ENCODED_NEGATIVE_INFINITY: TRpcEncodedValue = [TRpcEncodedType.Other, TRpcEncodedValueOther.NegativeInfinity];
const ENCODED_NAN: TRpcEncodedValue = [TRpcEncodedType.Other, TRpcEncodedValueOther.NaN];

function storeProvider<A = any>(): [
    indexOf: (value: A) => number | undefined,
    add: (value: A) => number,
    ] {
  const valueMap = new Map<A, number>();

  return [(value: A) => valueMap.get(value), (value: A) => {
    const index = valueMap.size;
    valueMap.set(value, index);
    return index;
  }];
}


/**
 * Converts arbitrary values (including functions, symbols, cyclic references,
 * `Error`, `RegExp`, `Date`, `NaN`/`Infinity`) into a compact, JSON-serializable
 * form and back — for passing data between threads/processes/client and server.
 *
 * Repeated strings, objects and arrays are deduplicated by index on encode and
 * reconstructed (including cycles) on decode. Functions are encoded as callable
 * references via `RpcFnCoder` when an `extrenalFnProvider` is supplied.
 *
 * @example
 * const coder = new RpcCoder();
 * const encoded = coder.encode({ a: 1, self: null as any });
 * const decoded = coder.decode(encoded); // => { a: 1, self: null }
 */
export class RpcCoder {
  static NON_ENCODABLE_TYPES = NON_ENCODABLE_TYPES;

  fnCoder: RpcFnCoder | null = null;
  private symbolCoder: RpcSymbolCoder | null = null;

  private internalPromiseFnIndexs: number[] = [];
  private internalPromises: Promise<any>[] = [];

  constructor(extrenalFnProvider?: TRpcExtrernalFnProvider | null, options?: {
        useSymols?: boolean,
    }) {
    const useSymols = options?.useSymols ?? true;
    this.fnCoder = extrenalFnProvider ? new RpcFnCoder(extrenalFnProvider) : null;
    this.symbolCoder = useSymols ? new RpcSymbolCoder() : null;
  }

  /**
   * Calls a previously encoded external function by its `RpcFnCoder` index.
   *
   * @param index - Function index assigned by `RpcFnCoder` during a prior `encode`.
   * @param args - Arguments to invoke the function with.
   * @returns The function's return value (or a `Promise` of it).
   */
  invoke(index: number, args: any[]): any | Promise<any> {
    return this.fnCoder?.invoke(index, args);
  }

  /**
   * Encodes a value into a compact, JSON-serializable representation.
   *
   * @param value - Value to encode; primitives (`number`/`string`/`boolean`) pass through unchanged.
   * @param withInternalFns - Whether functions reachable from `value` should be encoded as callable references (default `true`).
   * @returns Encoded data — pass to `decode` to reconstruct the original value.
   * @example
   * const coder = new RpcCoder();
   * coder.encode({ x: 1 }); // => [Type.Object, [...]]
   */
  encode(value: any, withInternalFns = true): TRpcEncodedData {
    if (value === null || NON_ENCODABLE_TYPES.includes(typeof value)) {
      return value;
    }

    const {
      symbolCoder,
      internalPromises,
      internalPromiseFnIndexs,
      fnCoder,
    } = this;
    const internalStrings = new Map<string, number>();
    const encodedStrings: string[] = [];
    const encodedObjects: TRpcEncodedDataObject[] = [];
    const encodedArrays: TRpcEncodedDataArray[] = [];

    const [getObjectIndex, addObject] = storeProvider<Record<string, any>>();
    const [getArrayIndex, addArray] = storeProvider<any[]>();

    function getStringIndex(value: string) {
      let index = internalStrings.get(value);
      if (index === undefined) {
        index = internalStrings.size;
        internalStrings.set(value, index);
        encodedStrings[index] = value;
      }
      return index;
    }

    const getEncodedPromiseFnValue = fnCoder ? (value: Promise<any>): TRpcEncodedValueFn => {
      const promiseIndex = this.internalPromises.indexOf(value);
      if (promiseIndex > -1) {
        return [0, internalPromiseFnIndexs[promiseIndex]];
      }
      const fnIndex = fnCoder.addInternal(() => value);
      internalPromiseFnIndexs.push(fnIndex);
      internalPromises.push(value);
      return [0, fnIndex];
    } : null;

    const encodedValue = base(value);

    return [
      encodedValue,
      encodedObjects,
      encodedArrays,
      encodedStrings,
    ];

    function encodeObject(v: Record<string, any>) {
      const index = addObject(v);
      const output: TRpcEncodedDataObject = encodedObjects[index] = [];
      const keyMap = {};

      let parent = v;
      let proto = Object.getPrototypeOf(parent);
      let key: string;

      while (proto) {
        for (key of Object.getOwnPropertyNames(parent)) {
          keyMap[key] = 1;
        }
        parent = proto;
        proto = Object.getPrototypeOf(parent);
      }

      for (key in keyMap) {
        output.push([getStringIndex(key), base(v[key], v)]);
      }
      return index;
    }

    function base(value: any, context?: any): TRpcEncodedValue {
      switch (typeof value) {
        case 'symbol':
          return symbolCoder
            ? [TRpcEncodedType.Symbol, symbolCoder.encode(value, getStringIndex(value.toString()))]
            : ENCODED_UNDEFINED;

        case 'undefined':
          return ENCODED_UNDEFINED;

        case 'number':
          if (value === Infinity) {
            return ENCODED_INFINITY;
          }
          if (value === -Infinity) {
            return ENCODED_NEGATIVE_INFINITY;
          }
          if (isNaN(value)) {
            return ENCODED_NAN;
          }

          break;

        case 'bigint':
          return [TRpcEncodedType.BigInt, getStringIndex(value.toString())];

        case 'string':
          return [TRpcEncodedType.String, getStringIndex(value)];

        case 'function': {
          const index = fnCoder?.encode(
            value, context, withInternalFns,
          );
          return index
            ? [TRpcEncodedType.Function, index]
            : ENCODED_UNDEFINED;
        }

        case 'object': {
          if (!value) {
            return value;
          }

          if (value instanceof Date) {
            return [TRpcEncodedType.Date, value.getTime()];
          }

          if (value instanceof RegExp) {
            return [TRpcEncodedType.RegExp, getStringIndex(value.toString())];
          }

          if (getEncodedPromiseFnValue && typeof value.then === 'function') {
            return [TRpcEncodedType.Promise, getEncodedPromiseFnValue(value)];
          }

          if (Array.isArray(value)) {
            let index = getArrayIndex(value);
            if (index === undefined) {
              index = addArray(value);
              const length = value.length;
              const output: TRpcEncodedDataArray = encodedArrays[index] = new Array(length);
              for (let i = 0; i < length; i++) {
                output[i] = base(value[i]);
              }
            }
            return [TRpcEncodedType.Array, index];
          }

          const index = getObjectIndex(value);

          if (index !== undefined) {
            return [TRpcEncodedType.Object, index];
          }

          if (value instanceof Error) {
            return [TRpcEncodedType.Error, encodeObject({
              name: value.name,
              message: value.toString(),
              code: (value as any).code || 0,
            })];
          }

          return [TRpcEncodedType.Object, encodeObject(value)];
        }
      }

      return value;
    }
  }

  /**
   * Decodes data previously produced by `encode` back into its original shape.
   *
   * @param encodedData - Encoded data as returned by `encode`.
   * @param withExternalFns - Whether encoded function references should be reconstructed as callables (default `true`).
   * @returns The decoded value.
   * @example
   * const coder = new RpcCoder();
   * coder.decode(coder.encode({ x: 1 })); // => { x: 1 }
   */
  decode(encodedData: TRpcEncodedData | undefined | null, withExternalFns = true): any {
    if (!encodedData || typeof encodedData !== 'object') {
      return encodedData;
    }

    const {
      symbolCoder,
      fnCoder,
    } = this;
    const [
      encodedValue,
      encodedObjects,
      encodedArrays,
      encodedStrings,
    ] = encodedData;

    const decodedObjects: Record<string, any>[] = [];
    const decodedArrays: any[][] = [];

    return base(encodedValue);

    function decodeObject(valueIndex: number) {
      let output = decodedObjects[valueIndex];
      if (output) {
        return output;
      }
      output = decodedObjects[valueIndex] = {};

      const input = encodedObjects[valueIndex];

      for (const keyValue of input) {
        output[encodedStrings[keyValue[0]]] = base(keyValue[1]);
      }
      return output;
    }

    function base(encodedValue: TRpcEncodedValue): any {
      if (!encodedValue || typeof encodedValue !== 'object') {
        return encodedValue;
      }

      switch (encodedValue[0]) {
        case TRpcEncodedType.Other:
          switch(encodedValue[1]) {
            case TRpcEncodedValueOther.Infinity:
              return Infinity;
            case TRpcEncodedValueOther.NegativeInfinity:
              return -Infinity;
            case TRpcEncodedValueOther.NaN:
              return NaN;
          }
          return;

        case TRpcEncodedType.String:
          return encodedStrings[encodedValue[1]];

        case TRpcEncodedType.BigInt:
          return BigInt(encodedStrings[encodedValue[1]]);

        case TRpcEncodedType.Symbol:
          return symbolCoder
            ? symbolCoder.decode(encodedValue[1], encodedStrings)
            : Symbol(encodedStrings[encodedValue[1][2]]);

        case TRpcEncodedType.Function:
          return fnCoder?.decode(encodedValue[1], withExternalFns);

        case TRpcEncodedType.Promise:
          return fnCoder?.decode(encodedValue[1], withExternalFns)?.();

        case TRpcEncodedType.Object:
          return decodeObject(encodedValue[1]);

        case TRpcEncodedType.Error: {
          const source = decodeObject(encodedValue[1]);
          const error = new Error(source.message);
          error.name = source.name;
          (error as any).code = source.code;
          return error;
        }

        case TRpcEncodedType.Array: {
          const valueIndex = encodedValue[1];
          let output = decodedArrays[valueIndex];
          if (output) {
            return output;
          }
          const input = encodedArrays[valueIndex];
          const length = input.length;
          output = decodedArrays[valueIndex] = new Array(length);

          for (let i = 0; i < length; i++) {
            output[i] = base(input[i]);
          }

          return output;
        }

        case TRpcEncodedType.Date:
          return new Date(encodedValue[1]);

        case TRpcEncodedType.RegExp: {
          const matchs = RE_REGEXP.exec(encodedStrings[encodedValue[1]] as string) as string[];
          return new RegExp(matchs[1], matchs[2]);
        }

      }
    }
  }
}