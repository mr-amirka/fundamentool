/**
 * Минимальный document/window для тестов, которые создают `<a>`, `<script>`, canvas.
 */
export function setupBrowserDomMocks(): { clickMock: jest.Mock } {
  const clickMock = jest.fn();

  const doc: any = {
    readyState: 'complete',
    documentElement: {
      clientWidth: 1024,
      clientHeight: 768,
    },
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
    head: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    createElement: jest.fn((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          target: '',
          style: '',
          download: '',
          click: clickMock,
        };
      }
      if (tagName === 'script') {
        return {
          src: '',
          type: '',
          charset: '',
          async: true,
        };
      }
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: jest.fn(),
          }),
          toDataURL: () => 'data:image/png;base64,TEST',
        };
      }
      return {};
    }),
  };

  const win: any = {
    document: doc,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  (global as any).document = doc;
  (global as any).window = win;

  return {
    clickMock, 
  };
}
