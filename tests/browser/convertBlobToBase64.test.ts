import {
  extractExportedFn,
} from './testUtils';

describe('browser/convertBlobToBase64', () => {
  beforeEach(() => {
    class FileReaderMock {
      public onload: null | (() => void) = null;
      public onerror: null | ((e: any) => void) = null;
      public result: any;

      readAsDataURL(_blob: Blob) {
        this.result = 'data:image/png;base64,TEST_BLOB';
        setImmediate(() => this.onload?.());
      }

      readAsText(blob: Blob) {
        blob.text().then((t) => {
          this.result = t;
          this.onload?.();
        });
      }

      abort() {}
    }

    (global as any).FileReader = FileReaderMock;
  });

  test('resolves data URL string', async () => {
    const convertBlobToBase64 = extractExportedFn(require('../../src/browser/convertBlobToBase64')) as (blob: Blob) => Promise<string>;

    const blob = new Blob(['test'], {
      type: 'text/plain',
    });
    const result = await convertBlobToBase64(blob);

    expect(typeof result).toBe('string');
    expect(result.startsWith('data:')).toBe(true);
  });
});

describe('browser/convertBlobToBase64 — a reader that gives no text', () => {
  it('rejects', async () => {
    (global as any).FileReader = class {
      public onload: null | (() => void) = null;
      public onerror: null | ((e: any) => void) = null;
      public result: any = new ArrayBuffer(1);
      readAsDataURL() {
        setImmediate(() => this.onload?.());
      }
    };
    const convert = extractExportedFn(require('../../src/browser/convertBlobToBase64')) as (blob: Blob) => Promise<string>;
    await expect(convert(new Blob(['x']))).rejects.toThrow('Failed to convert image to base64');
  });
});
