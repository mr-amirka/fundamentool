import {
  createSparseCodec,
} from '../src/SparseCodec';

// ── Helpers ──────────────────────────────────────────────────────────────────

const codec = createSparseCodec<{
  phys?: { grav?: number;
    steps?: number };
  ui?: { zoom?: number;
    label?: string };
}>({
  version: 0x01,
  fields: [
    {
      id: 0x01,
      path: 'phys.grav',
      type: 'f32',
      default: 1.0,
    },
    {
      id: 0x40,
      path: 'phys.steps',
      type: 'u8',
      default: 10,
    },
    {
      id: 0x02,
      path: [
        'phys',
        'grav',
      ],
      type: 'f32',
      default: 1.0,
    }, // array path to same field
    {
      id: 0x80,
      path: 'ui.zoom',
      type: 'f64',
      default: 1.0,
    },
    {
      id: 0x90,
      path: 'ui.label',
      type: 'string',
      default: '',
    },
  ],
});

const roundtrip = (state: Record<string, unknown>) => {
  const encoded = codec.encode(state as any);
  const decoded = codec.decode(encoded);
  return {
    encoded,
    decoded,
  };
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SparseCodec', () => {
  // ── Roundtrip ──────────────────────────────────────────────────────────────

  test('roundtrip: all fields changed', () => {
    const state = {
      phys: {
        grav: 2.5,
        steps: 5,
      },
      ui: {
        zoom: 2.0,
        label: 'hello',
      },
    };
    const {
      decoded,
    } = roundtrip(state);
    expect(decoded).toEqual(state);
  });

  test('roundtrip: f32 precision preserved', () => {
    const state = {
      phys: {
        grav: 1.0000001,
      },
    };
    const {
      decoded,
    } = roundtrip(state);
    // Float32 rounds to ~7 significant digits
    expect((decoded as any).phys.grav).toBeCloseTo(1.0, 5);
  });

  test('roundtrip: f64 precision preserved', () => {
    const state = {
      ui: {
        zoom: 1.123456789012345,
      },
    };
    const {
      decoded,
    } = roundtrip(state);
    expect((decoded as any).ui.zoom).toBe(1.123456789012345);
  });

  test('roundtrip: string with unicode', () => {
    const state = {
      ui: {
        label: 'Привет 🌍',
      },
    };
    const {
      decoded,
    } = roundtrip(state);
    expect(decoded).toEqual(state);
  });

  test('roundtrip: empty string', () => {
    const codec2 = createSparseCodec<{ s?: string }>({
      fields: [
        {
          id: 0x90,
          path: 's',
          type: 'string',
          default: 'default',
        },
      ],
    });
    const enc = codec2.encode({
      s: '',
    });
    const dec = codec2.decode(enc);
    expect(dec).toEqual({
      s: '',
    });
  });

  // ── Sparse (defaults not written) ──────────────────────────────────────────

  test('sparse: defaults produce empty payload', () => {
    const {
      encoded, decoded,
    } = roundtrip({});
    // Only version byte
    expect(encoded.length).toBeLessThan(5);
    expect(decoded).toEqual({});
  });

  test('sparse: only diffs are written', () => {
    const state = {
      phys: {
        grav: 1.0,
        steps: 5,
      },
    }; // grav=default, steps≠default
    const {
      encoded, decoded,
    } = roundtrip(state);
    expect(encoded.length).toBeGreaterThan(2);
    expect(encoded.length).toBeLessThan(10);
    expect(decoded).toEqual({
      phys: {
        steps: 5,
      },
    });
  });

  test('sparse: f32 default comparison avoids false diff', () => {
    // 1.0 as double → stored as f32 → read back → should equal default
    const state = {
      phys: {
        grav: 1.0,
        steps: 10,
      },
    }; // both defaults
    const {
      encoded,
    } = roundtrip(state);
    expect(encoded.length).toBeLessThan(5);
  });

  // ── String paths ───────────────────────────────────────────────────────────

  test('string path works same as array path', () => {
    const state = {
      phys: {
        grav: 3.0,
      },
    };
    const enc1 = codec.encode(state as any);
    // Both id:0x01 (string path) and id:0x02 (array path) encode the same field
    expect(enc1.length).toBeGreaterThan(0);
    const dec = codec.decode(enc1);
    expect((dec as any).phys.grav).toBe(3.0);
  });

  // ── Forward compatibility ──────────────────────────────────────────────────

  test('unknown ID: stops decoding, preserves already-decoded fields', () => {
    // Version 0x01, then id=0x40 (steps=5), then id=0x05 (unknown) — stops at unknown
    const buf = new ArrayBuffer(5);
    const dv = new DataView(buf);
    dv.setUint8(0, 0x01); // version
    dv.setUint8(1, 0x40); // steps (u8)
    dv.setUint8(2, 5);
    dv.setUint8(3, 0x05); // unknown
    dv.setUint8(4, 0);    // garbage
    const bytes: number[] = [];
    for (let i = 0; i < 5; i++) {
      bytes.push(new Uint8Array(buf)[i]);
    }
    const encoded = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const dec = codec.decode(encoded);
    expect(dec).toEqual({
      phys: {
        steps: 5,
      },
    });
  });

  // ── Version mismatch ──────────────────────────────────────────────────────

  test('version mismatch: returns null', () => {
    const codecV2 = createSparseCodec<{ x?: number }>({
      version: 0x02,
      fields: [
        {
          id: 0x01,
          path: 'x',
          type: 'f32',
          default: 0,
        },
      ],
    });
    const enc = codecV2.encode({
      x: 1,
    });
    // Decode with default codec (version 0x01) should reject
    const dec = codec.decode(enc);
    expect(dec).toBeNull();
  });

  // ── Corrupted input ────────────────────────────────────────────────────────

  test('corrupted: invalid base64 returns null', () => {
    expect(codec.decode('!!!not-base64!!!')).toBeNull();
  });

  test('corrupted: truncated header returns null', () => {
    // Version byte is always first — truncating to 0 chars = no version → null
    expect(codec.decode('')).toBeNull();
  });

  test('corrupted: garbage after valid payload is ignored', () => {
    const enc = codec.encode({
      phys: {
        grav: 2.0,
      },
    } as any);
    // Append garbage — decode should still work (stops at first unknown range)
    const withGarbage = enc + 'ZZZZ';
    const dec = codec.decode(withGarbage);
    expect(dec).toEqual({
      phys: {
        grav: 2.0,
      },
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  test('all default: encode then decode gives empty object', () => {
    const state = {
      phys: {
        grav: 1.0,
        steps: 10,
      },
      ui: {
        zoom: 1.0,
        label: '',
      },
    };
    const {
      decoded,
    } = roundtrip(state);
    expect(decoded).toEqual({});
  });
});

describe('createSparseCodec — every width, defaults, a cut payload', () => {
  const wide = createSparseCodec<{ a?: number;
    b?: number;
    c?: number;
    d?: number;
    s?: string }>({
    fields: [
      {
        id: 1,
        path: 'a',
        type: 'u8',
        default: 0,
      },
      {
        id: 2,
        path: 'b',
        type: 'u16',
        default: 0,
      },
      {
        id: 3,
        path: 'c',
        type: 'u32',
        default: 0,
      },
      {
        id: 4,
        path: 'd',
        type: 'f64',
        default: 0,
      },
      {
        id: 5,
        path: 's',
        type: 'string',
        default: '',
      },
    ],
  });
  /** Bytes as the codec's string. */
  const packed = (bytes: number[]) => Buffer.from(bytes).toString('base64url');

  it('u8 / u16 / u32 round-trip; a value equal to its default isn\'t written', () => {
    const state = {
      a: 200,
      b: 0xBEEF,
      c: 0xDEADBEEF,
      d: 0.5,
      s: 'ü',
    };
    expect(wide.decode(wide.encode(state))).toEqual(state);
    expect(wide.encode({
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      s: '',
    })).toBe(packed([1])); // only the version byte
  });

  it('a payload cut short keeps what was read before the cut', () => {
    expect(wide.decode(packed([
      1,
      1,
      7,
      2,
      0xBE,
    ]))).toEqual({
      a: 7,
    }); // u16 cut
    expect(wide.decode(packed([
      1,
      5,
      0,
    ]))).toEqual({}); // a string's length cut
    expect(wide.decode(packed([
      1,
      5,
      0,
      9,
      65,
    ]))).toEqual({}); // a string's bytes cut
  });
});

describe('createSparseCodec — what doesn\'t fit is an error, naming the field (D-057)', () => {
  const fields = createSparseCodec<any>({
    fields: [
      {
        id: 0x01,
        path: 'physics.gravity',
        type: 'f32',
        default: 1,
      },
      {
        id: 0x02,
        path: 'physics.exact',
        type: 'f64',
        default: 0,
      },
      {
        id: 0x50,
        path: 'params.galaxyCount',
        type: 'u8',
        default: 3,
      },
      {
        id: 0x60,
        path: 'attractors.pointsPerChar',
        type: 'u16',
        default: 40,
      },
      {
        id: 0x70,
        path: 'params.particleCount',
        type: 'u32',
        default: 20000,
      },
      {
        id: 0x80,
        path: 'title',
        type: 'string',
        default: '',
      },
    ],
  });
  const ENCODE = 'SparseCodec.encode: ';

  it.each([
    [
      {
        physics: {
          gravity: '2.5',
        },
      },
      TypeError,
      '"physics.gravity" expects a finite number within ±3.4e38 (f32), got string "2.5"',
    ],
    [
      {
        physics: {
          gravity: null,
        },
      },
      TypeError,
      '"physics.gravity" expects a finite number within ±3.4e38 (f32), got null',
    ],
    [
      {
        physics: {
          gravity: 1e40,
        },
      },
      RangeError,
      '"physics.gravity" expects a finite number within ±3.4e38 (f32), got number 1e+40',
    ],
    [
      {
        physics: {
          exact: Infinity,
        },
      },
      RangeError,
      '"physics.exact" expects a finite number (f64), got number Infinity',
    ],
    [
      {
        params: {
          galaxyCount: 300,
        },
      },
      RangeError,
      '"params.galaxyCount" expects a whole number 0…255 (u8), got number 300',
    ],
    [
      {
        params: {
          galaxyCount: 2.7,
        },
      },
      RangeError,
      '"params.galaxyCount" expects a whole number 0…255 (u8), got number 2.7',
    ],
    [
      {
        params: {
          galaxyCount: -1,
        },
      },
      RangeError,
      '"params.galaxyCount" expects a whole number 0…255 (u8), got number -1',
    ],
    [
      {
        attractors: {
          pointsPerChar: 70000,
        },
      },
      RangeError,
      '"attractors.pointsPerChar" expects a whole number 0…65535 (u16), got number 70000',
    ],
    [
      {
        params: {
          particleCount: 5000000000,
        },
      },
      RangeError,
      '"params.particleCount" expects a whole number 0…4294967295 (u32), got number 5000000000',
    ],
    [
      {
        title: 42,
      },
      TypeError,
      '"title" expects text of at most 65535 bytes (string), got number 42',
    ],
  ])('encode(%j) throws — it used to drop, wrap, cut or crash silently', (
    state, kind, message,
  ) => {
    expect(() => fields.encode(state)).toThrow(new (kind as ErrorConstructor)(ENCODE + message));
  });

  it('text longer than its two-byte length can say: an error, the value shown cut', () => {
    expect(() => fields.encode({
      title: 'x'.repeat(70000),
    })).toThrow(new RangeError(ENCODE + '"title" expects text of at most 65535 bytes (string), got string "'
      + 'x'.repeat(60) + '…" (70000 characters)'));
  });

  it('values that fit go through as before; a missing one is left out', () => {
    const state = {
      physics: {
        gravity: -2.5,
        exact: 0.1,
      },
      params: {
        galaxyCount: 255,
        particleCount: 4294967295,
      },
      attractors: {
        pointsPerChar: 0,
      },
      title: 'Andromeda',
    };
    expect(fields.decode(fields.encode(state))).toEqual(state);
    expect(fields.decode(fields.encode({}))).toEqual({});
  });

  it('the table is checked on creation: an id taken twice, a default that doesn\'t fit, a type or a key that doesn\'t exist', () => {
    const field = (extra: Record<string, unknown>) => ({
      id: 1,
      path: 'a',
      type: 'f32',
      default: 0,
      ...extra,
    });
    expect(() => createSparseCodec({
      fields: [
        field({}),
        field({
          path: [
            'b',
            'c',
          ],
        }),
      ],
    } as never)).toThrow('createSparseCodec: "fields"[1] ("b.c") has the id 1 of "a" — an id is a field\'s for good');
    expect(() => createSparseCodec({
      fields: [
        field({
          type: 'u8',
          default: 'x',
        }),
      ],
    } as never)).toThrow(new TypeError('createSparseCodec: "fields"[0]."default" (of "a") expects a whole number 0…255 (u8), got string "x"'));
    expect(() => createSparseCodec({
      fields: [
        field({
          type: 'string',
          default: 'y'.repeat(70000),
        }),
      ],
    } as never)).toThrow(/^createSparseCodec: "fields"\[0\]\."default" \(of "a"\) expects text of at most 65535 bytes/);
    expect(() => createSparseCodec({
      fields: [
        field({
          type: 'float',
        }),
      ],
    } as never)).toThrow(/createSparseCodec: "fields"\[0\]\."type" expects one of f32, f64, u8, u16, u32, string, bool, got string "float"/);
    expect(() => createSparseCodec({
      fields: [
        field({
          id: 300,
        }),
      ],
    } as never)).toThrow(/createSparseCodec: "fields"\[0\]\."id" expects a byte 0…255, got number 300/);
    expect(() => createSparseCodec({
      fields: [
        field({
          path: '',
        }),
      ],
    } as never)).toThrow(/"path"/);
    expect(() => createSparseCodec({
      fields: [],
      versoin: 2,
    } as never)).toThrow('createSparseCodec: unknown option "versoin". Did you mean "version"?');
  });
});

describe('createSparseCodec — bool', () => {
  const codec = createSparseCodec<{ braking?: boolean;
    sound?: boolean; }>({
    fields: [
      {
        id: 0x40,
        path: 'braking',
        type: 'bool',
        default: true,
      },
      {
        id: 0x41,
        path: 'sound',
        type: 'bool',
        default: false,
      },
    ],
  });

  it('true and false go as one byte and come back as they were; a value equal to its default isn\'t written', () => {
    expect(codec.decode(codec.encode({
      braking: false,
      sound: true,
    }))).toEqual({
      braking: false,
      sound: true,
    });
    expect(codec.encode({
      braking: true,
      sound: false,
    })).toBe('AQ');
  });

  it('a value that isn\'t true or false is an error; so is a default', () => {
    expect(() => codec.encode({
      braking: 1 as never,
    })).toThrow(new TypeError('SparseCodec.encode: "braking" expects true or false (bool), got number 1'));
    expect(() => createSparseCodec({
      fields: [
        {
          id: 1,
          path: 'a',
          type: 'bool',
          default: 0,
        },
      ],
    })).toThrow(new TypeError('createSparseCodec: "fields"[0]."default" (of "a") expects true or false (bool), got number 0'));
  });
});
