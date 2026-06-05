import { extractExportedFn } from './testUtils';
import { setupBrowserDomMocks } from './browserDomMocks';

describe('browser/download', () => {
  let clickMock: jest.Mock;

  beforeEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    ({ clickMock } = setupBrowserDomMocks());
  });

  test('base triggers click using mocked ready', async () => {
    jest.doMock('../../src/browser/ready', () => ({
      ready: (fn: any) => {
        fn();
        return () => true;
      },
    }));

    const result = await new Promise<boolean>((resolve, reject) => {
      jest.isolateModules(async () => {
        try {
          const downloadMod = require('../../src/browser/download');
          const download = extractExportedFn(downloadMod);
          const base = (download as any).base as (
            url: string,
            filename?: string,
          ) => Promise<boolean>;

          const r = await base('blob:test', 'file.txt');
          resolve(r);
        } catch (e) {
          reject(e);
        }
      });
    });

    expect(result).toBe(true);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect((global as any).document.body.appendChild).toHaveBeenCalled();
    expect((global as any).document.body.removeChild).toHaveBeenCalled();
  });
});
