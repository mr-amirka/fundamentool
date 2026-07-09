import {
  extractExportedFn, 
} from './testUtils';

describe('browser/script', () => {
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

  test('base resolves on onload', async () => {
    const instance: any = {};
    const head = {
      appendChild: jest.fn((node: any) => {
        Object.assign(instance, node);
      }),
    };

    (global as any).document = {
      head,
      createElement: jest.fn((tagName: string) => {
        if (tagName === 'script') {
          return {
            onreadystatechange: null,
            onload: null,
            onerror: null,
            readyState: 'complete',
            type: '',
            charset: '',
            async: false,
            src: '',
          };
        }
        return {};
      }),
    };

    const scriptMod = require('../../src/browser/script');
    const scriptFn = extractExportedFn(scriptMod) as (url: string) => Promise<void>;
    expect(typeof scriptFn).toBe('function');

    const p = scriptFn('https://example.com/a.js');

    expect(typeof instance.onload).toBe('function');
    instance.onload();

    await expect(p).resolves.toBeUndefined();
  });

  test('module exports a function', () => {
    const scriptMod = require('../../src/browser/script');
    const scriptFn = extractExportedFn(scriptMod);
    expect(typeof scriptFn).toBe('function');
  });
});
