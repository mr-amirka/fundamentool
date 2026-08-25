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
      path: ['phys', 'grav'],
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
      fields: [{
        id: 0x90,
        path: 's',
        type: 'string',
        default: 'default', 
      }],
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
      fields: [{
        id: 0x01,
        path: 'x',
        type: 'f32',
        default: 0, 
      }],
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

  test('number encoded as wrong type is skipped', () => {
    const codec3 = createSparseCodec<{ v?: number | string }>({
      fields: [{
        id: 0x01,
        path: 'v',
        type: 'f32',
        default: 0, 
      }],
    });
    // v is a string, but field expects number — should be skipped (getBase returns it, but typeof check in encode skips)
    const enc = codec3.encode({
      v: 'not-a-number', 
    } as any);
    const dec = codec3.decode(enc);
    expect(dec).toEqual({});
  });
});
