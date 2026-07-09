import {
  extractExportedFn, 
} from './testUtils';
import {
  setupImageHelpersDom, 
} from './imageDomMocks';

describe('browser/getImageNaturalSizeByUrl', () => {
  beforeEach(() => {
    setupImageHelpersDom();
  });

  test('resolves with width and height', async () => {
    const getImageNaturalSizeByUrl = extractExportedFn(require('../../src/browser/getImageNaturalSizeByUrl')) as (url: string) => Promise<[number, number]>;

    const result = await getImageNaturalSizeByUrl('https://example.com/image.png');
    expect(result).toEqual([100, 50]);
  });
});
