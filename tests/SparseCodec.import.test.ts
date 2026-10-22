/**
 * @jest-environment jsdom
 */
/**
 * Importing SparseCodec makes no text encoder: jsdom has no `TextEncoder` global, and an app's tests import fundamentool
 * without making a codec (web-games' components failed to start when the encoder was made on import).
 */
describe('SparseCodec — import', () => {
  it('works without a TextEncoder global; making a codec is what needs one', () => {
    const encoder = (globalThis as { TextEncoder?: unknown }).TextEncoder;
    delete (globalThis as { TextEncoder?: unknown }).TextEncoder;
    try {
      jest.isolateModules(() => {
        expect(() => require('../src/SparseCodec')).not.toThrow();
      });
    } finally {
      (globalThis as { TextEncoder?: unknown }).TextEncoder = encoder;
    }
  });
});
