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
    const { from } = require('../../../src/browser/blob');

    const blob1 = from('hello', 'text/plain');
    expect(blob1).toBeInstanceOf(Blob);
    expect(blob1.type).toBe('text/plain');

    const blob2 = from({ a: 1 });
    expect(blob2.type).toBe('application/json');

    const textProvider = require('../../../src/browser/blob').toText as (
      blob: Blob,
    ) => Promise<string>;
    await expect(textProvider(blob2)).resolves.toContain('"a":1');
  });
});
