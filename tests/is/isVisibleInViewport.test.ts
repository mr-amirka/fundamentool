import { isVisibleInViewportProvider } from '../../src/is/isVisibleInViewportProvider';

function makeCtx(innerWidth: number, innerHeight: number) {
  return {
    window: {
      innerWidth,
      innerHeight,
      document: { documentElement: { clientWidth: innerWidth, clientHeight: innerHeight } },
    },
  };
}

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

describe('isVisibleInViewportProvider', () => {
  const isVisible = isVisibleInViewportProvider(makeCtx(1024, 768));

  test('returns false for null element', () => {
    expect(isVisible(null)).toBe(false);
  });

  test('returns false for undefined element', () => {
    expect(isVisible(undefined)).toBe(false);
  });

  test('returns true for element fully within viewport', () => {
    const el = makeElement({ top: 10, left: 10, bottom: 200, right: 200 });
    expect(isVisible(el)).toBe(true);
  });

  test('returns false for element below viewport bottom', () => {
    const el = makeElement({ top: 10, left: 10, bottom: 900, right: 200 });
    expect(isVisible(el)).toBe(false);
  });

  test('returns false for element beyond viewport right edge', () => {
    const el = makeElement({ top: 10, left: 10, bottom: 200, right: 1200 });
    expect(isVisible(el)).toBe(false);
  });

  test('falls back to documentElement dimensions when window size is 0', () => {
    const ctx = {
      window: {
        innerWidth: 0,
        innerHeight: 0,
        document: { documentElement: { clientWidth: 1024, clientHeight: 768 } },
      },
    };
    const isVisibleFallback = isVisibleInViewportProvider(ctx);
    const el = makeElement({ top: 10, left: 10, bottom: 200, right: 200 });
    expect(isVisibleFallback(el)).toBe(true);
  });
});
