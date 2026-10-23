/**
 * Sparse binary codec factory.
 *
 * Encodes only values that differ from defaults.
 * Unknown field IDs stop decoding — already-decoded fields are preserved.
 */

import {
  set,
} from '../set';
import {
  getBase,
} from '../get';
import type {
  IFieldDef,
  ISparseCodec,
  ISparseCodecConfig,
} from './types';
import {
  array,
  boolean,
  number,
  object,
  oneOf,
  string,
  union,
  lazy,
} from '../schema';
import {
  describeValue,
} from '../describeValue';

// ── Type codes & sizes ───────────────────────────────────────────────────────

const T_F32 = 0;
const T_F64 = 1;
const T_U8  = 2;
const T_U16 = 3;
const T_U32 = 4;
const T_STR = 5;
const T_BOOL = 6;

const SZ_STR = 0;

const typeCode = (type: IFieldDef['type']): number => {
  if (type === 'f32') {
    return T_F32;
  }
  if (type === 'f64') {
    return T_F64;
  }
  if (type === 'u8')  {
    return T_U8;
  }
  if (type === 'u16') {
    return T_U16;
  }
  if (type === 'u32') {
    return T_U32;
  }
  return type === 'bool' ? T_BOOL : T_STR;
};

const typeSizeByCode = (code: number): number => {
  if (code === T_F32) {
    return 4;
  }
  if (code === T_F64) {
    return 8;
  }
  if (code === T_U8 || code === T_BOOL) {
    return 1;
  }
  if (code === T_U16) {
    return 2;
  }
  if (code === T_U32) {
    return 4;
  }
  return SZ_STR;
};

// ── Float equality (avoid double→f32/f64 rounding false diff) ────────────────

const BUF16 = new ArrayBuffer(16);
const VIEW16 = new DataView(BUF16);

const f32same = (a: number, b: number): boolean => {
  VIEW16.setFloat32(
    0, a, false,
  );
  VIEW16.setFloat32(
    4, b, false,
  );
  return VIEW16.getFloat32(0, false) === VIEW16.getFloat32(4, false);
};

const f64same = (a: number, b: number): boolean => {
  VIEW16.setFloat64(
    0, a, false,
  );
  VIEW16.setFloat64(
    8, b, false,
  );
  return VIEW16.getFloat64(0, false) === VIEW16.getFloat64(8, false);
};

// ── URL-safe base64 helpers ──────────────────────────────────────────────────

const toBase64Url = (bytes: number[]): string => {
  let binary = '';
  const len = bytes.length;
  let i = 0;
  for (; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const fromBase64Url = (encoded: string): Uint8Array | null => {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - b64.length % 4) % 4;
    const binary = atob(b64 + '='.repeat(pad));
    const len = binary.length;
    const bytes = new Uint8Array(len);
    let i = 0;
    for (; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
};

// ── What a field holds (D-057) ──────────────────────────────────────────────

/** The largest finite `f32`: a number beyond it is written as `Infinity`. */
const F32_MAX = 3.4028234663852886e38;
/** A string's length is written in two bytes. */
const STRING_BYTES_MAX = 0xFFFF;
/** The largest value of each whole-number type. */
const UINT_MAX: Record<number, number> = {
  [T_U8]: 0xFF,
  [T_U16]: 0xFFFF,
  [T_U32]: 0xFFFFFFFF,
};
/** What a message says each type holds. */
const EXPECTS: Record<number, string> = {
  [T_F32]: 'a finite number within ±3.4e38 (f32)',
  [T_F64]: 'a finite number (f64)',
  [T_U8]: 'a whole number 0…255 (u8)',
  [T_U16]: 'a whole number 0…65535 (u16)',
  [T_U32]: 'a whole number 0…4294967295 (u32)',
  [T_STR]: 'text of at most 65535 bytes (string)',
  [T_BOOL]: 'true or false (bool)',
};
/**
 * The text encoder, made on first use — never on import: importing fundamentool must work where `TextEncoder` isn't a
 * global (jsdom tests, old runtimes) as long as no codec is made there.
 */
let textEncoder: TextEncoder | undefined;
const encoder = (): TextEncoder => textEncoder || (textEncoder = new TextEncoder());

/**
 * Whether `value` fits a field of type `code` — what is written is read back as it was: no silent drop, wrap or
 * truncation. A string's byte length is checked where it is encoded (`encode` encodes it anyway).
 */
const fits = (code: number, value: unknown): boolean => {
  if (code === T_STR) {
    return typeof value === 'string';
  }
  if (code === T_BOOL) {
    return typeof value === 'boolean';
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }
  if (code === T_F32) {
    return value <= F32_MAX && value >= -F32_MAX;
  }
  return code === T_F64 || (Number.isInteger(value) && value >= 0 && value <= UINT_MAX[code]);
};

/**
 * The error for a value that doesn't fit its type: a `TypeError` for another type, a `RangeError` for one out of range.
 * `subject` names it — the field's path (`"physics.gravity"`), or its place in the table.
 */
const misfit = (
  where: string, subject: string, code: number, value: unknown,
): Error => new (
  typeof value === (code === T_STR ? 'string' : code === T_BOOL ? 'boolean' : 'number') ? RangeError : TypeError
)(`${where}: ${subject} expects ${EXPECTS[code]}, got ${describeValue(value)}`);

/** A field's path written as one string: `'physics.gravity'`. */
const PATH_SEPARATOR = '.';

/** A field's path as its keys. */
const pathOf = (path: string | string[]): string[] => (typeof path === 'string' ? path.split(PATH_SEPARATOR) : path);

/** How a message names a field: its path. */
const named = (path: readonly string[]): string => `"${path.join(PATH_SEPARATOR)}"`;

/** The codec's table — checked once on creation, in development only (D-057, lab D-023): built on first use. */
const CONFIG = /*#__PURE__*/ lazy(() => {
  /** A byte: an id, the version. */
  const byte = number().int().min(0).refine((value) => value <= 0xFF, (value) => `expects a byte 0…255, got ${describeValue(value)}`);
  return object({
    version: byte.optional(),
    fields: array(object({
      id: byte,
      path: union([
        string().refine((path) => path !== '', 'expects a path, got an empty string'),
        array(string()),
      ]),
      type: oneOf([
        'f32',
        'f64',
        'u8',
        'u16',
        'u32',
        'string',
        'bool',
      ]),
      default: union([
        number(),
        string(),
        boolean(),
      ]),
    })),
  });
});

const WHERE = 'createSparseCodec';

/** The table checked — in development only (lab D-023): its shape, every `id` once, every `default` fitting its type. */
const checkConfig = (config: ISparseCodecConfig): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    CONFIG().parse(config, WHERE);
    const owners: Record<number, string> = {};
    const fields = config.fields;
    const length = fields.length;
    for (let i = 0; i < length; i++) {
      const field = fields[i];
      const path = pathOf(field.path);
      const name = named(path);
      if (owners[field.id] !== undefined) {
        throw new Error(`${WHERE}: "fields"[${i}] (${name}) has the id ${field.id} of ${owners[field.id]} — an id is a field's for good`);
      }
      owners[field.id] = name;
      const code = typeCode(field.type);
      if (!fits(code, field.default)
        || (code === T_STR && encoder().encode(field.default as string).length > STRING_BYTES_MAX)) {
        throw misfit(
          WHERE, `"fields"[${i}]."default" (of ${named(path)})`, code, field.default,
        );
      }
    }
  }
};

// ── Build ID→field map ───────────────────────────────────────────────────────

type TFieldInfo = [path: string[], typeCode: number, def: number | string | boolean, size: number];

const buildMap = (fields: IFieldDef[]): Record<number, TFieldInfo> => {
  const map: Record<number, TFieldInfo> = {};
  const len = fields.length;
  let i = 0;
  let f: IFieldDef;
  let fp: string | string[];
  let tc: number;
  for (; i < len; i++) {
    f = fields[i];
    fp = f.path;
    tc = typeCode(f.type);
    map[f.id] = [
      pathOf(fp),
      tc,
      f.default,
      typeSizeByCode(tc),
    ];
  }
  return map;
};

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a sparse binary codec for a fixed field schema.
 *
 * Only values that differ from their configured `default` are written,
 * keeping encoded payloads short for state that is mostly at rest.
 * Encoding is a URL-safe base64 string; decoding stops (preserving
 * already-decoded fields) as soon as it meets a field ID missing from
 * the current `fields` schema — e.g. produced by a newer app version.
 *
 * @param config - Field schema (`fields`) and optional `version` byte.
 * @returns `{ encode, decode }` pair bound to the given schema.
 * @example
 * const codec = createSparseCodec<{ x: number; label: string }>({
 *   fields: [
 *     { id: 1, path: 'x', type: 'f32', default: 0 },
 *     { id: 2, path: 'label', type: 'string', default: '' },
 *   ],
 * });
 * const packed = codec.encode({ x: 42, label: '' }); // 'label' omitted — matches default
 * codec.decode(packed); // => { x: 42 }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSparseCodec = <T extends Record<string, any>>(
  config: ISparseCodecConfig,
): ISparseCodec<T> => {
  checkConfig(config);
  const version = config.version ?? 0x01;
  const fieldMap = buildMap(config.fields);

  // Flattened for encode fast path: pairs of [id, fieldInfo]
  const entries: [number, TFieldInfo][] = config.fields.map(({
    id,
  }: IFieldDef) => [
    id,
    fieldMap[id],
  ]);
  const fieldsLength = entries.length;

  // ── Encode ─────────────────────────────────────────────────────────────────

  const BUF8 = new ArrayBuffer(8);
  const VIEW8 = new DataView(BUF8);
  const U8 = new Uint8Array(BUF8);
  const TEX = encoder();
  const ENCODE = 'SparseCodec.encode';

  const encode = (state: T): string => {
    const bytes: number[] = [version];
    let ei = fieldsLength;

    let val: number | string | boolean;
    let id: number;
    let info: TFieldInfo;
    let infoDef: number | string | boolean;
    let prop: [number, TFieldInfo];
    let strBytes: Uint8Array;
    let strLen: number;
    let ji: number;
    let nval: number;
    let code: number;

    while (ei--) {
      prop = entries[ei];
      info = prop[1];
      val = getBase(state, info[0]);
      if (val === undefined) {
        continue;
      }

      id = prop[0];
      infoDef = info[2];
      code = info[1];
      if (!fits(code, val)) {
        throw misfit(
          ENCODE, named(info[0]), code, val,
        );
      }

      if (code !== T_STR) {
        switch (code) {
          case T_F32:
            if (f32same(val as number, infoDef as number)) {
              continue;
            }
            VIEW8.setFloat32(
              0, val as number, false,
            );
            bytes.push(
              id, U8[0], U8[1], U8[2], U8[3],
            );
            break;
          case T_F64:
            if (f64same(val as number, infoDef as number)) {
              continue;
            }
            VIEW8.setFloat64(
              0, val as number, false,
            );
            bytes.push(
              id, U8[0], U8[1], U8[2], U8[3], U8[4], U8[5], U8[6], U8[7],
            );
            break;
          case T_U8:
            if (val === infoDef) {
              continue;
            }
            nval = val as number;
            bytes.push(id, nval);
            break;
          case T_BOOL:
            if (val === infoDef) {
              continue;
            }
            bytes.push(id, val ? 1 : 0);
            break;
          case T_U16:
            if (val === infoDef) {
              continue;
            }
            nval = val as number;
            bytes.push(
              id, (nval >> 8) & 0xFF, nval & 0xFF,
            );
            break;
          default: // T_U32
            if (val === infoDef) {
              continue;
            }
            nval = val as number;
            bytes.push(
              id,
              (nval >>> 24) & 0xFF,
              (nval >>> 16) & 0xFF,
              (nval >>> 8) & 0xFF,
              nval & 0xFF,
            );
            break;
        }
      } else if (val !== infoDef) {
        strBytes = TEX.encode(val as string);
        strLen = strBytes.length;
        if (strLen > STRING_BYTES_MAX) {
          throw misfit(
            ENCODE, named(info[0]), code, val,
          );
        }
        bytes.push(
          id, (strLen >> 8) & 0xFF, strLen & 0xFF,
        );
        ji = 0;
        for (; ji < strLen; ji++) {
          bytes.push(strBytes[ji]);
        }
      }

    }

    return toBase64Url(bytes);
  };

  // ── Decode ─────────────────────────────────────────────────────────────────

  const TDE = new TextDecoder();

  const decode = (encoded: string): T | null => {
    const bytes = fromBase64Url(encoded);
    if (!bytes) {
      return null;
    }

    const len = bytes.length;
    let pos = 0;

    if (bytes[pos++] !== version) {
      return null;
    }

    const view = new DataView(
      bytes.buffer, bytes.byteOffset, bytes.byteLength,
    );
    let result: Record<string, unknown> = {};

    let id: number;
    let size: number;
    let val: number | string | boolean;
    let info: TFieldInfo | undefined;
    let strLen: number;

    while (pos < len) {
      id = bytes[pos++];

      info = fieldMap[id];
      if (!info) {
        break;
      }
      size = info[3];

      if (size === SZ_STR) {
        if (pos + 2 > len) {
          break;
        }
        strLen = (bytes[pos] << 8) | bytes[pos + 1];
        pos += 2;
        if (pos + strLen > len) {
          break;
        }
        val = TDE.decode(bytes.subarray(pos, pos + strLen));
        pos += strLen;
      } else {
        if (pos + size > len) {
          break;
        }
        switch (info[1]) {
          case T_F32:
            val = view.getFloat32(pos, false);
            break;
          case T_F64:
            val = view.getFloat64(pos, false);
            break;
          case T_U8:
            val = bytes[pos];
            break;
          case T_BOOL:
            val = bytes[pos] !== 0;
            break;
          case T_U16:
            val = view.getUint16(pos, false);
            break;
          default:
            val = view.getUint32(pos, false);
            break;
        }
        pos += size;
      }

      result = set(
        result, info[0], val,
      );
    }

    return result as T;
  };

  return {
    encode,
    decode,
  };
};
