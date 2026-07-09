import {
  extractExportedFn, 
} from './testUtils';
import {
  setupImageHelpersDom, 
} from './imageDomMocks';

describe('browser/getImageByUrl', () => {
  beforeEach(() => {
    setupImageHelpersDom();
  });

  test('resolves with Image instance', async () => {
    const getImageByUrl = extractExportedFn(require('../../src/browser/getImageByUrl')) as (url: string) => Promise<any>;

    const img = await getImageByUrl('https://example.com/image.png');
    expect(img).toBeInstanceOf((global as any).Image);
  });
});
