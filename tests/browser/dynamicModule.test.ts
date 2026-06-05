import { extractExportedFn } from './testUtils';

describe('browser/dynamicModule', () => {
  test('runs init only once and caches result', async () => {
    const dynamicModuleImport = require('../../src/browser/dynamicModule');
    const dynamicModule = extractExportedFn(dynamicModuleImport);

    let calls = 0;
    const init = async () => {
      calls += 1;
      return { value: 42 };
    };

    const loader = dynamicModule(init);
    const r1 = await loader();
    const r2 = await loader();

    expect(r1).toEqual({ value: 42 });
    expect(r2).toEqual({ value: 42 });
    expect(calls).toBe(1);
  });
});
