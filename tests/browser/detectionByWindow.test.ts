import {
  extractExportedFn, 
} from './testUtils';

const detectionByWindow = extractExportedFn(require('../../src/browser/detectionByWindow'));

describe('browser/detectionByWindow', () => {
  test('adds orientation and multitouch flags when present', () => {
    const windowLike: any = {
      orientation: 0,
      navigator: {
        maxTouchPoints: 5,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      },
    };

    const result = detectionByWindow(windowLike);

    expect(result).toContain('orientation');
    expect(result).toContain('multitouch');
  });

  test('works with minimal window-like object', () => {
    const windowLike: any = {
      navigator: {
        userAgent: '',
      },
    };

    const result = detectionByWindow(windowLike);

    expect(result).toBe('');
  });
});
