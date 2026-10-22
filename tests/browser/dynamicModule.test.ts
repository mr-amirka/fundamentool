import {
  extractExportedFn,
} from './testUtils';

describe('browser/dynamicModule', () => {
  test('runs init only once and caches result', async () => {
    const dynamicModuleImport = require('../../src/browser/dynamicModule');
    const dynamicModule = extractExportedFn(dynamicModuleImport);

    let calls = 0;
    const init = async () => {
      calls += 1;
      return {
        value: 42,
      };
    };

    const loader = dynamicModule(init);
    const r1 = await loader();
    const r2 = await loader();

    expect(r1).toEqual({
      value: 42,
    });
    expect(r2).toEqual({
      value: 42,
    });
    expect(calls).toBe(1);
  });
});

describe('browser/dynamicModule — a failed init', () => {
  it('rejects (logged), and is forgotten: the next call runs init again', async () => {
    const {
      dynamicModule,
    } = require('../../src/browser/dynamicModule');
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const failure = new Error('init');
      let calls = 0;
      const load = dynamicModule(() => {
        if (!calls++) {
          throw failure;
        }
        return 'ready';
      });
      await expect(load()).rejects.toBe(failure);
      expect(error).toHaveBeenCalledWith(failure);
      await expect(load()).resolves.toBe('ready');
      expect(calls).toBe(2);
    } finally {
      error.mockRestore();
    }
  });
});
