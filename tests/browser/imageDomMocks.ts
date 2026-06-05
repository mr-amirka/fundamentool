/**
 * document/window + `Image` для тестов getImage* / getBase64Image.
 */
export function setupImageHelpersDom(): void {
  const doc: any = {
    createElement: jest.fn((tagName: string) => {
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
    innerWidth: 800,
    innerHeight: 600,
    document: Object.assign(doc, {
      width: 0,
      height: 0,
      documentElement: {
        clientWidth: 1024,
        clientHeight: 768,
      },
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  (global as any).document = win.document;
  (global as any).window = win;

  (global as any).Image = class MockImage {
    public onload: (() => void) | null = null;
    public onerror: ((e: any) => void) | null = null;
    public naturalWidth = 100;
    public naturalHeight = 50;
    public width = 100;
    public height = 50;
    private _src = '';

    set src(v: string) {
      this._src = v;
      this.onload?.();
    }

    get src() {
      return this._src;
    }
  };
}
