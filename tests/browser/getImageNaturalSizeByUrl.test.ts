import {
  extractExportedFn,
} from './testUtils';
import {
  setImageSize,
  setupImageHelpersDom,
} from './imageDomMocks';

describe('browser/getImageNaturalSizeByUrl', () => {
  let getImageNaturalSizeByUrl: (url: string) => Promise<[number, number]>;
  beforeEach(() => {
    setupImageHelpersDom();
    getImageNaturalSizeByUrl = extractExportedFn(require('../../src/browser/getImageNaturalSizeByUrl')) as typeof getImageNaturalSizeByUrl;
  });

  test('resolves with width and height', async () => {
    const result = await getImageNaturalSizeByUrl('https://example.com/image.png');
    expect(result).toEqual([
      100,
      50,
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
    await expect(getImageNaturalSizeByUrl('a.svg')).resolves.toEqual([
      30,
      10,
    ]);
    setImageSize([
      0,
      0,
    ], [
      0,
      0,
    ]);
    await expect(getImageNaturalSizeByUrl('a.svg')).resolves.toEqual([
      0,
      0,
    ]);
  });
});
