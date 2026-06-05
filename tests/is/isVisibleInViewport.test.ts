import { isVisibleInViewport } from '../../src/is/isVisibleInViewport';

function makeElement(rect: Partial<DOMRect>): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
      ...rect,
    }),
  } as unknown as HTMLElement;
}

describe('isVisibleInViewport', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;

  beforeEach(() => {
    (global as any).window = { innerWidth: 1024, innerHeight: 768 };
    (global as any).document = { documentElement: { clientWidth: 1024, clientHeight: 768 } };
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    (global as any).document = originalDocument;
  });

  test('returns false for null/undefined element', () => {
    expect(isVisibleInViewport(null)).toBe(false);
    expect(isVisibleInViewport(undefined)).toBe(false);
  });

  test('returns true for element fully within viewport', () => {
    const el = makeElement({ top: 10, left: 10, bottom: 200, right: 200 });
    expect(isVisibleInViewport(el)).toBe(true);
  });

  test('returns false for element below viewport bottom', () => {
    const el = makeElement({ top: 10, left: 10, bottom: 900, right: 200 });
    expect(isVisibleInViewport(el)).toBe(false);
  });

  test('returns false for element beyond viewport right edge', () => {
    const el = makeElement({ top: 10, left: 10, bottom: 200, right: 1200 });
    expect(isVisibleInViewport(el)).toBe(false);
  });
});
