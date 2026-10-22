import {
  extractExportedFn,
} from './testUtils';

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

describe('browser/dynamic — a failed load', () => {
  it('rejects, and is forgotten: the next call tries again', async () => {
    const {
      dynamic,
    } = require('../../src/browser/dynamic');
    const {
      script,
    } = require('../../src/browser/script');
    const failure = new Error('404');
    const base = jest.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const original = script.base;
    script.base = base;
    try {
      const url = 'https://example.com/flaky.js';
      await expect(dynamic(url)).rejects.toBe(failure);
      await expect(dynamic(url)).resolves.toBeUndefined();
      expect(base).toHaveBeenCalledTimes(2);
    } finally {
      script.base = original;
    }
  });
});
