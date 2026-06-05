describe('browser/getDataLink', () => {
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

  test('creates blob URL', () => {
    const getDataLink = require('../../src/browser/getDataLink').getDataLink as (
      content: any,
      type?: string,
    ) => string;

    const createObjectURL = URL.createObjectURL;
    const spy = jest.fn().mockReturnValue('blob:TEST');
    (URL as any).createObjectURL = spy;

    const link = getDataLink('hello', 'text/plain');

    expect(link).toBe('blob:TEST');
    expect(spy).toHaveBeenCalledTimes(1);

    (URL as any).createObjectURL = createObjectURL;
  });
});
