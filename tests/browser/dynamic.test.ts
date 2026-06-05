import { extractExportedFn } from './testUtils';

describe('browser/dynamic', () => {
  test('caches script loading by href', async () => {
    const dynamicImport = require('../../src/browser/dynamic');
    const dynamic = extractExportedFn(dynamicImport);

    const scriptImport = require('../../src/browser/script');
    const script = extractExportedFn(scriptImport) || scriptImport;

    const spyBase = jest.fn().mockResolvedValue(undefined);
    (script as any).base = spyBase;

    const url = 'https://example.com/a.js';
    await dynamic(url);
    await dynamic(url);

    expect(spyBase).toHaveBeenCalledTimes(1);
  });
});
