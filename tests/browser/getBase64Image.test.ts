import {
  extractExportedFn, 
} from './testUtils';
import {
  setupImageHelpersDom, 
} from './imageDomMocks';

describe('browser/getBase64Image', () => {
  beforeEach(() => {
    setupImageHelpersDom();
  });

  test('returns data URL string', async () => {
    const getBase64Image = extractExportedFn(require('../../src/browser/getBase64Image')) as (url: string, options?: any) => Promise<string>;

    const dataUrl = await getBase64Image('https://example.com/image.png');
    expect(dataUrl).toBe('data:image/png;base64,TEST');
  });
});
