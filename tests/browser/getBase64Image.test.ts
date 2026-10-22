import {
  extractExportedFn,
} from './testUtils';
import {
  setImageSize,
  setupImageHelpersDom,
} from './imageDomMocks';

type TGetBase64Image = (url: string, options?: any) => Promise<string>;

/** The canvas the next `getBase64Image` draws on: its size, what was drawn where, the type asked for. */
function captureCanvas(context: 'none' | '2d' = '2d') {
  const canvas = {
    width: -1,
    height: -1,
    drawn: [] as unknown[],
    type: '',
    getContext: () => context === '2d'
      ? {
        drawImage: (
          _img: unknown, left: number, top: number,
        ) => {
          canvas.drawn.push([
            left,
            top,
          ]);
        },
      }
      : null,
    toDataURL: (type: string) => {
      canvas.type = type;
      return `data:${type};base64,TEST`;
    },
  };
  (global as any).document.createElement = () => canvas;
  return canvas;
}

describe('browser/getBase64Image', () => {
  let getBase64Image: TGetBase64Image;
  beforeEach(() => {
    setupImageHelpersDom();
    getBase64Image = extractExportedFn(require('../../src/browser/getBase64Image')) as TGetBase64Image;
  });

  test('returns data URL string', async () => {
    const dataUrl = await getBase64Image('https://example.com/image.png');
    expect(dataUrl).toBe('data:image/png;base64,TEST');
  });

  it('the size, the offset and the type asked for', async () => {
    const canvas = captureCanvas();
    await expect(getBase64Image('a.png', {
      width: 40,
      height: 20,
      left: -5,
      top: -3,
      type: 'image/jpeg',
    })).resolves.toBe('data:image/jpeg;base64,TEST');
    expect([
      canvas.width,
      canvas.height,
      canvas.drawn,
      canvas.type,
    ]).toEqual([
      40,
      20,
      [
        [
          -5,
          -3,
        ],
      ],
      'image/jpeg',
    ]);
  });

  it('no natural size: the element\'s size; none at all: 0 × 0', async () => {
    setImageSize([
      0,
      0,
    ], [
      30,
      10,
    ]);
    let canvas = captureCanvas();
    await getBase64Image('a.svg');
    expect([
      canvas.width,
      canvas.height,
      canvas.drawn,
    ]).toEqual([
      30,
      10,
      [
        [
          0,
          0,
        ],
      ],
    ]);
    setImageSize([
      0,
      0,
    ], [
      0,
      0,
    ]);
    canvas = captureCanvas();
    await getBase64Image('a.svg');
    expect([
      canvas.width,
      canvas.height,
    ]).toEqual([
      0,
      0,
    ]);
  });

  it('no 2D context (the canvas is disabled): rejects', async () => {
    captureCanvas('none');
    await expect(getBase64Image('a.png')).rejects.toThrow('Canvas 2D context is not available.');
  });
});
