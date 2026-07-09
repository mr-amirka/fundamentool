import {
  convertUrlToBase64, 
} from '../../src/browser/convertUrlToBase64';

describe('browser/convertUrlToBase64', () => {
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

  test('composes url->blob->base64', async () => {
    const originalFetch = global.fetch;
    (global as any).fetch = jest.fn().mockResolvedValue({
      blob: async () => new Blob(['ok'], {
        type: 'text/plain', 
      }),
    });

    const result = await convertUrlToBase64('https://example.com/test.txt');
    expect(typeof result).toBe('string');
    expect(result.startsWith('data:')).toBe(true);

    global.fetch = originalFetch as any;
  });
});
