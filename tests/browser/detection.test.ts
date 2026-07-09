import {
  extractExportedFn, 
} from './testUtils';

const detection = extractExportedFn(require('../../src/browser/detection'));

describe('browser/detection', () => {
  test('parses known agents and versions from userAgent', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const result = detection(ua);

    expect(result).toContain('mozilla');
    expect(result).toContain('chrome');
    expect(result).toContain('safari');
  });

  test('returns empty string for empty userAgent', () => {
    expect(detection('')).toBe('');
  });
});
