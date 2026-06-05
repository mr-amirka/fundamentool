describe('browser/getViewportSize', () => {
  beforeEach(() => {
    const doc: any = {
      createElement: jest.fn(),
      documentElement: {
        clientWidth: 1024,
        clientHeight: 768,
      },
    };
    const win: any = {
      innerWidth: 800,
      innerHeight: 600,
      document: doc,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    (global as any).document = doc;
    (global as any).window = win;
  });

  test('returns tuple [width, height]', () => {
    const { getViewportSize } = require('../../src/browser/getViewportSize') as {
      getViewportSize: () => [number, number];
    };

    const size = getViewportSize();
    expect(size).toEqual([800, 600]);
  });
});
