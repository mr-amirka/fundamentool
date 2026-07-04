export type TFieldType = 'f32' | 'f64' | 'u8' | 'u16' | 'u32' | 'string';

export interface IFieldDef {
  /** Permanent field ID — never reorder or reuse. */
  id: number;
  /** Path to value: dot-separated string (`'physics.gravity'`) or array (`['physics', 'gravity']`). */
  path: string | string[];
  /** Value type: f32/f64/u8/u16/u32/string. Determines encoding via ID range. */
  type: TFieldType;
  /** Default value — omitted from encoding when equal. */
  default: number | string;
}

export interface ISparseCodecConfig {
  /** Protocol version byte (default: 0x01). */
  version?: number;
  /** Field definitions. */
  fields: IFieldDef[];
}

export interface ISparseCodec<T extends Record<string, any>> {
  /** Encode state to URL-safe base64. Only diffs from defaults are written. */
  encode(state: T): string;
  /** Decode URL-safe base64 to partial state. Returns null on error. */
  decode(encoded: string): T | null;
}
