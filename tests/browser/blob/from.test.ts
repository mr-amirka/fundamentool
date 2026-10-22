describe('browser/blob/from', () => {
  beforeEach(() => {
    class FileReaderMock {
      public onload: null | (() => void) = null;
      public onerror: null | ((e: any) => void) = null;
      public result: any;

      readAsText(blob: Blob) {
        blob.text().then((t) => {
          this.result = t;
          this.onload?.();
        });
      }

      readAsDataURL(_blob: Blob) {
        this.result = 'data:TEST';
        this.onload?.();
      }

      readAsArrayBuffer(_blob: Blob) {
        this.result = new ArrayBuffer(0);
        this.onload?.();
      }

      abort() {}
    }

    (global as any).FileReader = FileReaderMock;
  });

  test('creates Blob with correct type; toText reads JSON', async () => {
    const {
      from,
    } = require('../../../src/browser/blob');

    const blob1 = from('hello', 'text/plain');
    expect(blob1).toBeInstanceOf(Blob);
    expect(blob1.type).toBe('text/plain');

    const blob2 = from({
      a: 1,
    });
    expect(blob2.type).toBe('application/json');

    const textProvider = require('../../../src/browser/blob').toText as (
      blob: Blob,
    ) => Promise<string>;
    await expect(textProvider(blob2)).resolves.toContain('"a":1');
  });

  it('a Blob as it is; binary (an ArrayBuffer, a typed array\'s buffer); nothing — an empty binary; a value — its text', async () => {
    const {
      from,
    } = require('../../../src/browser/blob/from');
    const blob = new Blob(['x']);
    expect(from(blob)).toBe(blob);

    const bytes = new Uint8Array([
      1,
      2,
      3,
    ]);
    const fromBuffer = from(bytes.buffer);
    const fromView = from(bytes);
    for (const binary of [
      fromBuffer,
      fromView,
    ]) {
      expect(binary.type).toBe('application/octet-binary');
      expect([...new Uint8Array(await binary.arrayBuffer())]).toEqual([
        1,
        2,
        3,
      ]);
    }

    const empty = from(undefined);
    expect([
      empty.type,
      empty.size,
    ]).toEqual([
      'application/octet-binary',
      0,
    ]);

    const text = from(42);
    expect(text.type).toBe('text/plain');
    await expect(text.text()).resolves.toBe('42');
  });

  it('a view keeps to its own bytes — not the buffer under it (a part of an array, a pooled Node Buffer)', async () => {
    const {
      from,
    } = require('../../../src/browser/blob/from');
    const part = from(new Uint8Array([
      1,
      2,
      3,
      4,
    ]).subarray(1, 3));
    expect([...new Uint8Array(await part.arrayBuffer())]).toEqual([
      2,
      3,
    ]);
    const pooled = from(Buffer.from('hi'));
    expect(pooled.size).toBe(2);
    await expect(pooled.text()).resolves.toBe('hi');
  });
});

describe('browser/blob — the index', () => {
  it('re-exports the reader provider and from', () => {
    const blob = require('../../../src/browser/blob');
    expect(blob.provider).toBe(require('../../../src/browser/blob/provider').provider);
    expect(blob.from).toBe(require('../../../src/browser/blob/from').from);
  });
});
