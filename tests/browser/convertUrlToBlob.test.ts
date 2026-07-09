import {
  convertUrlToBlob, 
} from '../../src/browser/convertUrlToBlob';

describe('browser/convertUrlToBlob', () => {
  test('uses fetch and returns Blob', async () => {
    const originalFetch = global.fetch;
    (global as any).fetch = jest.fn().mockResolvedValue({
      blob: async () => new Blob(['ok'], {
        type: 'text/plain', 
      }),
    });

    const blob = await convertUrlToBlob('https://example.com/test.txt');
    expect(blob).toBeInstanceOf(Blob);

    global.fetch = originalFetch as any;
  });
});
