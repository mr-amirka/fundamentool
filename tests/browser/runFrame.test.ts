import { extractExportedFn } from './testUtils';

describe('browser/runFrame', () => {
  test('calls callback and can be stopped', () => {
    const runFrameImport = require('../../src/browser/runFrame');
    const runFrame = extractExportedFn(runFrameImport);

    let captured: undefined | ((time: number) => void);
    (global as any).requestAnimationFrame = (cb: (time: number) => void) => {
      captured = cb;
      return 1;
    };

    const spy = jest.fn();
    const stop = runFrame(spy, 0);

    expect(captured).toBeDefined();
    captured?.(16);
    expect(spy).toHaveBeenCalled();

    stop();
  });
});
